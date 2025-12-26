import chalk from 'chalk';

/**
 * Logging utilities for pipeline visibility
 */

export class Logger {
    private static indent = 0;
    private static currentStep = '';

    static step(name: string, total?: number, current?: number): void {
        this.currentStep = name;
        const progress = total && current ? ` [${current}/${total}]` : '';
        console.log(chalk.bold.cyan(`\n${'  '.repeat(this.indent)}▶ ${name}${progress}`));
    }

    static substep(name: string): void {
        console.log(chalk.blue(`${'  '.repeat(this.indent + 1)}→ ${name}`));
    }

    static success(message: string): void {
        console.log(chalk.green(`${'  '.repeat(this.indent + 1)}✓ ${message}`));
    }

    static info(message: string): void {
        console.log(chalk.gray(`${'  '.repeat(this.indent + 1)}ℹ ${message}`));
    }

    static warn(message: string): void {
        console.log(chalk.yellow(`${'  '.repeat(this.indent + 1)}⚠ ${message}`));
    }

    static error(message: string, error?: Error): void {
        console.error(chalk.red(`${'  '.repeat(this.indent + 1)}✗ ${message}`));
        if (error) {
            console.error(chalk.red(`${'  '.repeat(this.indent + 2)}${error.message}`));
            if (error.stack) {
                console.error(chalk.gray(error.stack));
            }
        }
    }

    static data(label: string, value: any): void {
        console.log(chalk.gray(`${'  '.repeat(this.indent + 1)}${label}: ${chalk.white(value)}`));
    }

    static progress(current: number, total: number, label: string = ''): void {
        const percentage = Math.round((current / total) * 100);
        const barLength = 30;
        const filled = Math.round((current / total) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        process.stdout.write(
            `\r${'  '.repeat(this.indent + 1)}${chalk.cyan(bar)} ${percentage}% ${label}`
        );

        if (current === total) {
            console.log(); // New line when complete
        }
    }

    static table(data: Record<string, any>): void {
        console.log();
        const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

        for (const [key, value] of Object.entries(data)) {
            const paddedKey = key.padEnd(maxKeyLength);
            console.log(
                chalk.gray(`${'  '.repeat(this.indent + 1)}${paddedKey} : `) +
                chalk.white(value)
            );
        }
        console.log();
    }

    static section(title: string): void {
        const line = '─'.repeat(60);
        console.log(chalk.cyan(`\n${'  '.repeat(this.indent)}${line}`));
        console.log(chalk.bold.cyan(`${'  '.repeat(this.indent)}${title}`));
        console.log(chalk.cyan(`${'  '.repeat(this.indent)}${line}\n`));
    }

    static increaseIndent(): void {
        this.indent++;
    }

    static decreaseIndent(): void {
        this.indent = Math.max(0, this.indent - 1);
    }

    static getCurrentStep(): string {
        return this.currentStep;
    }
}

/**
 * Timer for measuring execution time
 */
export class Timer {
    private startTime: number;
    private label: string;

    constructor(label: string) {
        this.label = label;
        this.startTime = Date.now();
    }

    end(): void {
        const duration = Date.now() - this.startTime;
        const seconds = (duration / 1000).toFixed(2);
        Logger.info(`${this.label} completed in ${chalk.bold(seconds)}s`);
    }
}

/**
 * Error context for better debugging
 */
export class PipelineError extends Error {
    constructor(
        message: string,
        public readonly step: string,
        public readonly context?: Record<string, any>,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'PipelineError';
    }

    toString(): string {
        let output = `\n${chalk.red.bold('Pipeline Error')}\n`;
        output += chalk.red(`Step: ${this.step}\n`);
        output += chalk.red(`Message: ${this.message}\n`);

        if (this.context) {
            output += chalk.yellow('\nContext:\n');
            for (const [key, value] of Object.entries(this.context)) {
                output += chalk.yellow(`  ${key}: ${JSON.stringify(value, null, 2)}\n`);
            }
        }

        if (this.originalError) {
            output += chalk.gray('\nOriginal Error:\n');
            output += chalk.gray(this.originalError.stack || this.originalError.message);
        }

        return output;
    }
}
