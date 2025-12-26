import { useState, useEffect } from 'react'
import { ArchitectureGraph } from './engine/architecture/graph'
import { CostCalculator } from './engine/calculator/engine'
import { DEFAULT_CONTEXT, CostBreakdown } from './core/types'
import { EC2Plugin } from './services/aws/ec2/plugin'
import { VPCPlugin } from './services/aws/vpc/plugin'
import { pricingLoader } from './engine/pricing/loader'
import './App.css'

function App() {
    const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load pricing data on mount
    useEffect(() => {
        loadPricingData()
    }, [])

    async function loadPricingData() {
        try {
            // Load EC2 pricing
            const ec2Response = await fetch('/pricing/aws/v1/services/ec2.json')
            const ec2Data = await ec2Response.json()
            pricingLoader.preload(ec2Data)

            // Load VPC pricing
            const vpcResponse = await fetch('/pricing/aws/v1/services/vpc.json')
            const vpcData = await vpcResponse.json()
            pricingLoader.preload(vpcData)

            console.log('✓ Pricing data loaded')
        } catch (err) {
            console.error('Failed to load pricing data:', err)
            setError('Failed to load pricing data. Please ensure pricing pipeline has run.')
        }
    }

    async function calculateCosts() {
        setLoading(true)
        setError(null)

        try {
            // Create architecture graph
            const graph = new ArchitectureGraph()

            // Create plugins
            const ec2Plugin = new EC2Plugin()
            const vpcPlugin = new VPCPlugin()

            // Create VPC with NAT Gateway
            const vpcNodes = vpcPlugin.createNodes({
                cidr: '10.0.0.0/16',
                name: 'main-vpc',
                natGateways: 1,
                hasInternetGateway: true,
                dataTransferGB: 100,
            })

            vpcNodes.forEach(node => graph.addNode(node))

            // Create EC2 instances
            const ec2Nodes = ec2Plugin.createNodes({
                instanceType: 't3.micro',
                instanceCount: 2,
                name: 'web-servers',
            })

            ec2Nodes.forEach(node => graph.addNode(node))

            // Calculate costs
            const calculator = new CostCalculator(
                [ec2Plugin, vpcPlugin],
                DEFAULT_CONTEXT
            )

            const result = await calculator.getBreakdown(graph)
            setBreakdown(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="app">
            <header className="header">
                <div className="container">
                    <h1>AWS Cost Estimator</h1>
                    <p>Architecture-driven cloud cost estimation</p>
                </div>
            </header>

            <main className="main container">
                <section className="architecture-section">
                    <h2>Example Architecture</h2>
                    <div className="architecture-card">
                        <div className="arch-item">
                            <span className="arch-icon">🌐</span>
                            <div>
                                <h3>VPC</h3>
                                <p>10.0.0.0/16</p>
                            </div>
                        </div>
                        <div className="arch-item">
                            <span className="arch-icon">🔀</span>
                            <div>
                                <h3>NAT Gateway</h3>
                                <p>1 gateway, 100 GB/month</p>
                            </div>
                        </div>
                        <div className="arch-item">
                            <span className="arch-icon">🌍</span>
                            <div>
                                <h3>Internet Gateway</h3>
                                <p>100 GB/month data transfer</p>
                            </div>
                        </div>
                        <div className="arch-item">
                            <span className="arch-icon">💻</span>
                            <div>
                                <h3>EC2 Instances</h3>
                                <p>2 × t3.micro</p>
                            </div>
                        </div>
                    </div>

                    <button
                        className="calculate-btn"
                        onClick={calculateCosts}
                        disabled={loading}
                    >
                        {loading ? 'Calculating...' : 'Calculate Costs'}
                    </button>
                </section>

                {error && (
                    <div className="error-box">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {breakdown && (
                    <section className="results-section">
                        <div className="total-cost">
                            <h2>Total Monthly Cost</h2>
                            <div className="cost-amount">
                                ${breakdown.total.toFixed(2)}
                            </div>
                        </div>

                        <div className="breakdown">
                            <h3>Cost Breakdown</h3>
                            {Array.from(breakdown.byService.entries()).map(([service, items]) => {
                                const serviceTotal = items.reduce((sum, item) => sum + item.cost, 0)
                                return (
                                    <div key={service} className="service-group">
                                        <div className="service-header">
                                            <h4>{service.toUpperCase()}</h4>
                                            <span className="service-total">${serviceTotal.toFixed(2)}/mo</span>
                                        </div>
                                        <div className="line-items">
                                            {items.map((item, idx) => (
                                                <div key={idx} className="line-item">
                                                    <div className="item-info">
                                                        <span className="item-component">{item.component}</span>
                                                        <span className="item-description">{item.description}</span>
                                                    </div>
                                                    <div className="item-calc">
                                                        <span className="item-quantity">
                                                            {item.quantity} {item.unit}
                                                        </span>
                                                        <span className="item-rate">
                                                            × ${item.rate.toFixed(4)}
                                                        </span>
                                                        <span className="item-cost">
                                                            = ${item.cost.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="item-provenance">
                                                        Triggered by: {item.triggeredBy.join(', ')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}
            </main>

            <footer className="footer">
                <div className="container">
                    <p>AWS Cost Estimator - Architecture-driven cost calculation</p>
                    <p className="footer-meta">
                        Region: {DEFAULT_CONTEXT.region} |
                        Pricing Version: {DEFAULT_CONTEXT.pricingVersion} |
                        Hours/Month: {DEFAULT_CONTEXT.hoursPerMonth}
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default App
