const Scanner = require('./scanner/scanner');
const { startWebServer } = require('./web/server');
const chalk = require('chalk');

let scanner = null;
let webServer = null;

async function startBot() {
    try {
        console.log(chalk.blue('🤖 Starting Kijiji Discord Bot...\n'));

        // Start the scanner
        scanner = new Scanner();
        await scanner.start();

        console.log(chalk.green('✅ Scanner is running!\n'));

        // Start the web server with shared services
        console.log(chalk.blue('🌐 Starting Web UI...\n'));
        webServer = await startWebServer({
            db: scanner.db,
            kijijiService: scanner.kijijiService,
            discordService: scanner.discordService
        });

        console.log(chalk.green(`\n✅ All systems running!`));
        console.log(chalk.cyan(`📊 Web UI: http://localhost:${webServer.port}`));
        console.log(chalk.yellow('Press Ctrl+C to stop.\n'));

        // Keep the process alive
        process.stdin.resume();

    } catch (error) {
        console.error(chalk.red('❌ Failed to start bot:', error.message));
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));

    if (scanner) {
        scanner.stop();
    }

    if (webServer && webServer.server) {
        await new Promise((resolve) => {
            webServer.server.close(resolve);
        });
        console.log(chalk.green('✅ Web server stopped.'));
    }

    console.log(chalk.green('✅ Shutdown complete.'));
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n🛑 Received SIGTERM, shutting down...'));

    if (scanner) {
        scanner.stop();
    }

    if (webServer && webServer.server) {
        await new Promise((resolve) => {
            webServer.server.close(resolve);
        });
    }

    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:', error.message));
    console.error(error.stack);

    if (scanner) {
        scanner.stop();
    }

    if (webServer && webServer.server) {
        webServer.server.close();
    }

    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:', promise, 'reason:', reason));

    if (scanner) {
        scanner.stop();
    }

    if (webServer && webServer.server) {
        webServer.server.close();
    }

    process.exit(1);
});

// Start the bot
startBot(); 