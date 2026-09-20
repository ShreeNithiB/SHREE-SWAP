import { expect } from "chai";
import { ethers } from "hardhat";
import { SHREE, ShreeSwap } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SHREE and ShreeSwap", function () {
  let shree: SHREE;
  let shreeSwap: ShreeSwap;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const SHREEFactory = await ethers.getContractFactory("SHREE");
    shree = await SHREEFactory.deploy();
    await shree.waitForDeployment();

    const ShreeSwapFactory = await ethers.getContractFactory("ShreeSwap");
    shreeSwap = await ShreeSwapFactory.deploy(await shree.getAddress());
    await shreeSwap.waitForDeployment();
  });

  describe("SHREE Token", function () {
    it("Should have correct name and symbol", async function () {
      expect(await shree.name()).to.equal("SHREE");
      expect(await shree.symbol()).to.equal("SH");
    });

    it("Should mint initial 500,000 to deployer", async function () {
      const balance = await shree.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther("500000"));
    });

    it("Max supply should be 1,000,000", async function () {
      expect(await shree.MAX_SUPPLY()).to.equal(ethers.parseEther("1000000"));
    });
  });

  describe("ShreeSwap AMM", function () {
    const initialSH = ethers.parseEther("100000"); // 100k SH
    const initialETH = ethers.parseEther("1");     // 1 ETH

    beforeEach(async function () {
      await shree.approve(await shreeSwap.getAddress(), initialSH);
      await shreeSwap.addLiquidity(initialSH, { value: initialETH });
    });

    it("Should add initial liquidity", async function () {
      const shReserve = await shreeSwap.getSHReserve();
      const ethReserve = await shreeSwap.getETHReserve();

      expect(shReserve).to.equal(initialSH);
      expect(ethReserve).to.equal(initialETH);

      const shares = await shreeSwap.liquidity(owner.address);
      expect(shares).to.equal(initialETH);
    });

    it("Should swap ETH for SH", async function () {
      const swapETH = ethers.parseEther("0.1"); // 0.1 ETH in
      
      const ethReserveBefore = await shreeSwap.getETHReserve();
      const shReserveBefore = await shreeSwap.getSHReserve();

      const expectedSH = await shreeSwap.getOutputAmount(swapETH, ethReserveBefore, shReserveBefore);

      await expect(shreeSwap.connect(user1).swapETHForSH(0, { value: swapETH }))
        .to.emit(shreeSwap, "Swap")
        .withArgs(user1.address, swapETH, expectedSH, false);

      const shBalance = await shree.balanceOf(user1.address);
      expect(shBalance).to.equal(expectedSH);
    });

    it("Should swap SH for ETH", async function () {
      const swapSH = ethers.parseEther("1000");
      // Transfer SH to user2
      await shree.transfer(user2.address, swapSH);
      
      await shree.connect(user2).approve(await shreeSwap.getAddress(), swapSH);

      const ethReserveBefore = await shreeSwap.getETHReserve();
      const shReserveBefore = await shreeSwap.getSHReserve();

      const expectedETH = await shreeSwap.getOutputAmount(swapSH, shReserveBefore, ethReserveBefore);

      const tx = await shreeSwap.connect(user2).swapSHForETH(swapSH, 0);
      
      await expect(tx)
        .to.emit(shreeSwap, "Swap")
        .withArgs(user2.address, swapSH, expectedETH, true);
    });

    it("Should remove liquidity", async function () {
      const shares = await shreeSwap.liquidity(owner.address);
      
      const tx = await shreeSwap.removeLiquidity(shares);
      
      await expect(tx)
        .to.emit(shreeSwap, "LiquidityRemoved")
        .withArgs(owner.address, initialSH, initialETH, shares);

      const shReserve = await shreeSwap.getSHReserve();
      const ethReserve = await shreeSwap.getETHReserve();

      expect(shReserve).to.equal(0);
      expect(ethReserve).to.equal(0);
    });
  });
});
