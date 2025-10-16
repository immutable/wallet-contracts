#!/bin/bash

# run-all.sh
# Executes all sample app scenarios sequentially

echo "🧪 Biconomy Nexus Sample App - Running All Scenarios"
echo "================================================================"
echo ""

# Check if MIGRATION_TEST_OWNER_PK is set
if [ -z "$MIGRATION_TEST_OWNER_PK" ]; then
    echo "❌ ERROR: MIGRATION_TEST_OWNER_PK environment variable not set"
    echo "Usage: MIGRATION_TEST_OWNER_PK=0x... ./run-all.sh"
    exit 1
fi

# Track results
SUCCESS_COUNT=0
FAIL_COUNT=0
TOTAL=5

echo "📋 Running Phase 1: Single Chain Scenarios (Base Sepolia)"
echo ""

# Scenario 1: Native Token Transfer
echo "──────────────────────────────────────────────────────────────"
echo "Scenario 1/5: Native Token Transfer"
echo "──────────────────────────────────────────────────────────────"
if npx hardhat run scripts/biconomy-migration/sample-app/01-native-token-transfer.ts --network base_sepolia; then
    ((SUCCESS_COUNT++))
    echo "✅ Scenario 1: SUCCESS"
else
    ((FAIL_COUNT++))
    echo "❌ Scenario 1: FAILED"
fi
echo ""

# Scenario 2: ERC20 Transfer
echo "──────────────────────────────────────────────────────────────"
echo "Scenario 2/5: ERC20 Token Transfer"
echo "──────────────────────────────────────────────────────────────"
if npx hardhat run scripts/biconomy-migration/sample-app/02-erc20-transfer.ts --network base_sepolia; then
    ((SUCCESS_COUNT++))
    echo "✅ Scenario 2: SUCCESS"
else
    ((FAIL_COUNT++))
    echo "❌ Scenario 2: FAILED"
fi
echo ""

# Scenario 3: NFT Purchase (Template - will succeed but not execute real purchase)
echo "──────────────────────────────────────────────────────────────"
echo "Scenario 3/5: NFT Purchase via Seaport (Template Mode)"
echo "──────────────────────────────────────────────────────────────"
if npx hardhat run scripts/biconomy-migration/sample-app/03-nft-purchase-seaport.ts --network base_sepolia; then
    ((SUCCESS_COUNT++))
    echo "✅ Scenario 3: SUCCESS (Template)"
else
    ((FAIL_COUNT++))
    echo "❌ Scenario 3: FAILED"
fi
echo ""

# Scenario 4: Invisible Signing
echo "──────────────────────────────────────────────────────────────"
echo "Scenario 4/5: Invisible Signing"
echo "──────────────────────────────────────────────────────────────"
if npx hardhat run scripts/biconomy-migration/sample-app/04-invisible-signing.ts --network base_sepolia; then
    ((SUCCESS_COUNT++))
    echo "✅ Scenario 4: SUCCESS"
else
    ((FAIL_COUNT++))
    echo "❌ Scenario 4: FAILED"
fi
echo ""

# Scenario 5: Gas Sponsorship
echo "──────────────────────────────────────────────────────────────"
echo "Scenario 5/5: Gas Sponsorship"
echo "──────────────────────────────────────────────────────────────"
if npx hardhat run scripts/biconomy-migration/sample-app/05-gas-sponsorship.ts --network base_sepolia; then
    ((SUCCESS_COUNT++))
    echo "✅ Scenario 5: SUCCESS"
else
    ((FAIL_COUNT++))
    echo "❌ Scenario 5: FAILED"
fi
echo ""

# Summary
echo "================================================================"
echo "📊 SUMMARY"
echo "================================================================"
echo "Total Scenarios:  $TOTAL"
echo "Successful:       $SUCCESS_COUNT"
echo "Failed:           $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 ALL SCENARIOS COMPLETED SUCCESSFULLY!"
    exit 0
else
    echo "⚠️  Some scenarios failed. Check logs above for details."
    exit 1
fi

