import { ethers } from 'hardhat';
import config from './config.json';

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

interface CheckResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
    details?: string;
}

const results: CheckResult[] = [];

function printHeader(title: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`${COLORS.bright}${title}${COLORS.reset}`);
    console.log('='.repeat(80));
}

function printCheck(result: CheckResult) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const color = result.status === 'PASS' ? COLORS.green : result.status === 'FAIL' ? COLORS.red : COLORS.yellow;

    console.log(`\n${icon} ${color}${result.name}${COLORS.reset}`);
    console.log(`   ${result.message}`);
    if (result.details) {
        console.log(`   ${COLORS.cyan}${result.details}${COLORS.reset}`);
    }
}

async function checkNetwork() {
    printHeader('NETWORK CONFIGURATION CHECK');

    try {
        const network = await ethers.provider.getNetwork();
        const blockNumber = await ethers.provider.getBlockNumber();

        if (Number(network.chainId) === config.network.chainId) {
            results.push({
                name: 'Network',
                status: 'PASS',
                message: `Connected to ${config.network.name}`,
                details: `Chain ID: ${network.chainId} | Block: ${blockNumber}`,
            });
        } else {
            results.push({
                name: 'Network',
                status: 'FAIL',
                message: `Wrong network! Expected ${config.network.chainId}, got ${network.chainId}`,
            });
        }

        // Test latency
        const start = Date.now();
        await ethers.provider.getBlockNumber();
        const latency = Date.now() - start;

        results.push({
            name: 'RPC Latency',
            status: latency < 1000 ? 'PASS' : 'WARNING',
            message: `${latency}ms ${latency < 1000 ? '(Good)' : '(Slow)'}`,
        });
    } catch (error: any) {
        results.push({
            name: 'Network',
            status: 'FAIL',
            message: `Failed to connect: ${error.message}`,
        });
    }

    results.forEach(printCheck);
}

async function checkWallet() {
    printHeader('WALLET & BALANCE CHECK');

    try {
        const ownerPK = process.env[config.owner.envVar];

        if (!ownerPK) {
            results.push({
                name: 'Owner Private Key',
                status: 'FAIL',
                message: `${config.owner.envVar} not set in environment`,
            });
            return;
        }

        results.push({
            name: 'Owner Private Key',
            status: 'PASS',
            message: 'Configured',
        });

        const wallet = new ethers.Wallet(ownerPK, ethers.provider);
        const address = await wallet.getAddress();

        if (address.toLowerCase() === config.owner.address.toLowerCase()) {
            results.push({
                name: 'Owner Address',
                status: 'PASS',
                message: address,
            });
        } else {
            results.push({
                name: 'Owner Address',
                status: 'WARNING',
                message: `Address mismatch! Expected ${config.owner.address}, got ${address}`,
            });
        }

        // Check balance
        const balance = await ethers.provider.getBalance(address);
        const balanceEth = ethers.utils.formatEther(balance);
        const balanceUsd = parseFloat(balanceEth) * 2500; // Rough estimate

        const minRequired = ethers.utils.parseEther('0.002'); // ~$5 (with 10x buffer for gas spikes)

        if (balance.gte(minRequired)) {
            results.push({
                name: 'ETH Balance',
                status: 'PASS',
                message: `${balanceEth} ETH (~$${balanceUsd.toFixed(2)} USD)`,
                details: `Minimum required: 0.002 ETH (~$5.00) - With 10x buffer for gas spikes`,
            });
        } else {
            results.push({
                name: 'ETH Balance',
                status: 'FAIL',
                message: `${balanceEth} ETH (~$${balanceUsd.toFixed(2)} USD) - INSUFFICIENT`,
                details: `Need at least 0.002 ETH (~$5.00). Missing: ${ethers.utils.formatEther(minRequired.sub(balance))} ETH`,
            });
        }
    } catch (error: any) {
        results.push({
            name: 'Wallet',
            status: 'FAIL',
            message: `Error: ${error.message}`,
        });
    }

    results.slice(-4).forEach(printCheck);
}

async function checkBiconomyContracts() {
    printHeader('BICONOMY CONTRACTS CHECK');

    const contracts = [
        { name: 'Nexus Implementation', address: config.biconomy.contracts.nexusImplementation },
        { name: 'Nexus Factory', address: config.biconomy.contracts.nexusFactory },
        { name: 'Nexus Bootstrap', address: config.biconomy.contracts.nexusBootstrap },
        { name: 'K1 Validator', address: config.biconomy.contracts.k1Validator },
        { name: 'EntryPoint', address: config.biconomy.contracts.entryPoint },
    ];

    for (const contract of contracts) {
        try {
            // Get checksum address
            const checksumAddress = ethers.utils.getAddress(contract.address);
            const code = await ethers.provider.getCode(checksumAddress);

            if (code !== '0x') {
                results.push({
                    name: contract.name,
                    status: 'PASS',
                    message: `${checksumAddress.slice(0, 10)}...${checksumAddress.slice(-8)}`,
                    details: 'Contract deployed',
                });
            } else {
                results.push({
                    name: contract.name,
                    status: 'FAIL',
                    message: `${checksumAddress} - NOT DEPLOYED`,
                });
            }
        } catch (error: any) {
            results.push({
                name: contract.name,
                status: 'FAIL',
                message: `Error checking: ${error.message}`,
            });
        }
    }

    results.slice(-contracts.length).forEach(printCheck);
}

async function checkAPIKeys() {
    printHeader('API KEYS CHECK');

    const bundlerKey = process.env[config.biconomy.bundlerApiKeyEnvVar];
    const paymasterKey = process.env[config.biconomy.paymasterApiKeyEnvVar];

    if (bundlerKey) {
        results.push({
            name: 'Bundler API Key',
            status: 'PASS',
            message: `${bundlerKey.slice(0, 10)}...${bundlerKey.slice(-6)}`,
        });
    } else {
        results.push({
            name: 'Bundler API Key',
            status: 'WARNING',
            message: `${config.biconomy.bundlerApiKeyEnvVar} not set (optional)`,
        });
    }

    if (paymasterKey) {
        results.push({
            name: 'Paymaster API Key',
            status: 'PASS',
            message: `${paymasterKey.slice(0, 10)}...${paymasterKey.slice(-6)}`,
        });
    } else {
        results.push({
            name: 'Paymaster API Key',
            status: 'WARNING',
            message: `${config.biconomy.paymasterApiKeyEnvVar} not set (optional for tests without sponsorship)`,
        });
    }

    results.slice(-2).forEach(printCheck);
}

async function checkGasPrice() {
    printHeader('GAS PRICE CHECK');

    try {
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice;

        if (!gasPrice) {
            results.push({
                name: 'Gas Price',
                status: 'WARNING',
                message: 'Could not fetch gas price',
            });
            return;
        }

        const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));

        // Estimate costs
        const passportInfraDeploy = gasPrice.mul(15_000_000); // ~15M gas
        const passportWalletDeploy = gasPrice.mul(2_000_000); // ~2M gas
        const migration = gasPrice.mul(2_000_000); // ~2M gas
        const testing = gasPrice.mul(3_000_000); // ~3M gas total

        const totalGas = passportInfraDeploy.add(passportWalletDeploy).add(migration).add(testing);
        const totalEth = ethers.utils.formatEther(totalGas);
        const totalUsd = parseFloat(totalEth) * 2500;

        if (gasPriceGwei < 2) {
            results.push({
                name: 'Gas Price',
                status: 'PASS',
                message: `${gasPriceGwei.toFixed(2)} gwei (LOW - Great time to deploy!)`,
            });
        } else if (gasPriceGwei < 5) {
            results.push({
                name: 'Gas Price',
                status: 'PASS',
                message: `${gasPriceGwei.toFixed(2)} gwei (MODERATE)`,
            });
        } else {
            results.push({
                name: 'Gas Price',
                status: 'WARNING',
                message: `${gasPriceGwei.toFixed(2)} gwei (HIGH - Consider waiting)`,
            });
        }

        results.push({
            name: 'Estimated Total Cost',
            status: totalUsd < 80 ? 'PASS' : 'WARNING',
            message: `~${totalEth} ETH (~$${totalUsd.toFixed(2)} USD)`,
            details: `Infra: $${(parseFloat(ethers.utils.formatEther(passportInfraDeploy)) * 2500).toFixed(2)} | Wallet: $${(parseFloat(ethers.utils.formatEther(passportWalletDeploy)) * 2500).toFixed(2)} | Migration: $${(parseFloat(ethers.utils.formatEther(migration)) * 2500).toFixed(2)} | Testing: $${(parseFloat(ethers.utils.formatEther(testing)) * 2500).toFixed(2)}`,
        });
    } catch (error: any) {
        results.push({
            name: 'Gas Price',
            status: 'FAIL',
            message: `Error: ${error.message}`,
        });
    }

    results.slice(-2).forEach(printCheck);
}

async function checkTokens() {
    printHeader('TOKENS CHECK');

    try {
        // Check USDC contract
        const usdcAddress = config.tokens.usdc.address;
        const code = await ethers.provider.getCode(usdcAddress);

        if (code !== '0x') {
            results.push({
                name: 'USDC Contract',
                status: 'PASS',
                message: `${usdcAddress.slice(0, 10)}...${usdcAddress.slice(-8)}`,
                details: 'Available for ERC20 tests',
            });
        } else {
            results.push({
                name: 'USDC Contract',
                status: 'FAIL',
                message: 'USDC not deployed on this network',
            });
        }
    } catch (error: any) {
        results.push({
            name: 'USDC Contract',
            status: 'FAIL',
            message: `Error: ${error.message}`,
        });
    }

    results.slice(-1).forEach(printCheck);
}

function printSummary() {
    printHeader('PRE-FLIGHT CHECK SUMMARY');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;

    console.log(`\n${COLORS.green}✅ PASSED:${COLORS.reset}   ${passed}/${results.length}`);
    console.log(`${COLORS.red}❌ FAILED:${COLORS.reset}   ${failed}/${results.length}`);
    console.log(`${COLORS.yellow}⚠️  WARNINGS:${COLORS.reset} ${warnings}/${results.length}`);

    console.log('\n' + '='.repeat(80));

    if (failed === 0) {
        console.log(`${COLORS.green}${COLORS.bright}✅ ALL CHECKS PASSED!${COLORS.reset}`);
        console.log('\n🚀 Ready to proceed with mainnet POC!\n');
        console.log('Next step:');
        console.log(`  ${COLORS.cyan}npx hardhat run scripts/deploy.ts --network base${COLORS.reset}`);
    } else {
        console.log(`${COLORS.red}${COLORS.bright}❌ CHECKS FAILED!${COLORS.reset}`);
        console.log(`\n🛑 Cannot proceed - fix the following issues:\n`);

        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  ${COLORS.red}❌ ${r.name}:${COLORS.reset} ${r.message}`);
        });
    }

    console.log('='.repeat(80) + '\n');
}

async function main() {
    console.log(`\n${COLORS.bright}${COLORS.blue}🔍 MAINNET POC - PRE-FLIGHT CHECK${COLORS.reset}`);
    console.log(`${COLORS.cyan}Target: ${config.network.name} (Chain ID: ${config.network.chainId})${COLORS.reset}`);
    console.log(`${COLORS.cyan}Budget: $${config.budget.total} USD${COLORS.reset}\n`);

    await checkNetwork();
    await checkWallet();
    await checkBiconomyContracts();
    await checkAPIKeys();
    await checkGasPrice();
    await checkTokens();

    printSummary();

    // Exit with error code if any checks failed
    const hasFailed = results.some(r => r.status === 'FAIL');
    process.exit(hasFailed ? 1 : 0);
}

main()
    .then(() => { })
    .catch(error => {
        console.error(`${COLORS.red}Error:${COLORS.reset}`, error);
        process.exit(1);
    });

