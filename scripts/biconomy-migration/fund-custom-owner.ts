import { ethers } from "hardhat";

async function fundCustomOwner() {
    const [deployer] = await ethers.getSigners();
    const customOwner = "0xA2De953eD1AeBd64E29eb3C4ACce0367e70Ef778"; // NEW owner

    console.log(`Funding ${customOwner} with 0.01 ETH for gas...`);

    const tx = await deployer.sendTransaction({
        to: customOwner,
        value: ethers.utils.parseEther("0.01")
    });

    await tx.wait();
    console.log(`✅ Done! TX: ${tx.hash}`);
}

fundCustomOwner().catch(console.error);

