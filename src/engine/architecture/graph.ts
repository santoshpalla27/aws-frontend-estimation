/**
 * Architecture graph engine
 * Manages architecture nodes with dependency and conflict validation
 */

import { ArchitectureNode } from "../types.ts";

export class ArchitectureGraph {
    private nodes: Map<string, ArchitectureNode> = new Map();

    /**
     * Add node to graph with validation
     * Validation must pass before graph mutation
     * 
     * @param node - Architecture node to add
     * @throws Error if dependencies don't exist or conflicts are detected
     */
    addNode(node: ArchitectureNode): void {
        // Validate dependencies exist
        this.validateDependencies(node);

        // Check for conflicts
        this.validateConflicts(node);

        // Only mutate graph after validation passes
        this.nodes.set(node.id, node);
    }

    /**
     * Remove node from graph
     * 
     * @param nodeId - ID of node to remove
     */
    removeNode(nodeId: string): void {
        this.nodes.delete(nodeId);
    }

    /**
     * Get node by ID
     * 
     * @param nodeId - Node ID
     * @returns Node or undefined
     */
    getNode(nodeId: string): ArchitectureNode | undefined {
        return this.nodes.get(nodeId);
    }

    /**
     * Safe accessor for all nodes - never expose internal Map
     * 
     * @returns Array of all nodes
     */
    getAllNodes(): ArchitectureNode[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Get all dependencies of a node
     * 
     * @param nodeId - Node ID
     * @returns Array of dependency nodes
     */
    getDependencies(nodeId: string): ArchitectureNode[] {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return [];
        }

        return node.dependencies
            .map((id) => this.nodes.get(id))
            .filter((n): n is ArchitectureNode => n !== undefined);
    }

    /**
     * Get all nodes of a specific type
     * Useful for finding shared resources (e.g., VPC, NAT Gateway)
     * 
     * @param type - Node type
     * @returns Array of nodes matching type
     */
    getSharedResources(type: string): ArchitectureNode[] {
        return this.getAllNodes().filter((n) => n.type === type);
    }

    /**
     * Get all nodes for a specific service
     * 
     * @param service - Service name
     * @returns Array of nodes for service
     */
    getNodesByService(service: string): ArchitectureNode[] {
        return this.getAllNodes().filter((n) => n.service === service);
    }

    /**
     * Clear all nodes
     */
    clear(): void {
        this.nodes.clear();
    }

    /**
     * Get node count
     */
    size(): number {
        return this.nodes.size;
    }

    /**
     * Validate dependencies exist
     * 
     * @throws Error if any dependency doesn't exist
     */
    private validateDependencies(node: ArchitectureNode): void {
        for (const depId of node.dependencies) {
            if (!this.nodes.has(depId)) {
                throw new Error(
                    `Missing dependency: ${depId} for node ${node.id}`
                );
            }
        }
    }

    /**
     * Validate no conflicts exist
     * 
     * @throws Error if conflicting node exists
     */
    private validateConflicts(node: ArchitectureNode): void {
        for (const conflictType of node.conflicts) {
            const existing = this.getSharedResources(conflictType);
            if (existing.length > 0) {
                throw new Error(
                    `Conflict: ${node.id} conflicts with existing ${conflictType}: ${existing.map((n) => n.id).join(", ")}`
                );
            }
        }
    }

    /**
     * Validate graph is acyclic (no circular dependencies)
     * 
     * @throws Error if circular dependency detected
     */
    validateAcyclic(): void {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const visit = (nodeId: string): void => {
            if (recursionStack.has(nodeId)) {
                throw new Error(`Circular dependency detected: ${nodeId}`);
            }

            if (visited.has(nodeId)) {
                return;
            }

            visited.add(nodeId);
            recursionStack.add(nodeId);

            const node = this.nodes.get(nodeId);
            if (node) {
                for (const depId of node.dependencies) {
                    visit(depId);
                }
            }

            recursionStack.delete(nodeId);
        };

        for (const nodeId of this.nodes.keys()) {
            visit(nodeId);
        }
    }

    /**
     * Get topologically sorted nodes
     * Dependencies come before dependents
     * 
     * @returns Array of nodes in topological order
     */
    getTopologicalOrder(): ArchitectureNode[] {
        const visited = new Set<string>();
        const result: ArchitectureNode[] = [];

        const visit = (nodeId: string): void => {
            if (visited.has(nodeId)) {
                return;
            }

            visited.add(nodeId);

            const node = this.nodes.get(nodeId);
            if (node) {
                // Visit dependencies first
                for (const depId of node.dependencies) {
                    visit(depId);
                }

                result.push(node);
            }
        };

        for (const nodeId of this.nodes.keys()) {
            visit(nodeId);
        }

        return result;
    }
}

