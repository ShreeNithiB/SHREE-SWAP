// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ShreeSwap is ReentrancyGuard {
    IERC20 public immutable shreeToken;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    // Swap fee is 0.3%
    uint256 public constant FEE_PERCENT = 3; 
    uint256 public constant FEE_DENOMINATOR = 1000;

    event LiquidityAdded(address indexed provider, uint256 amountSH, uint256 amountETH, uint256 liquidityShares);
    event LiquidityRemoved(address indexed provider, uint256 amountSH, uint256 amountETH, uint256 liquidityShares);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool isSHForETH);

    constructor(address _shreeToken) {
        require(_shreeToken != address(0), "Invalid token address");
        shreeToken = IERC20(_shreeToken);
    }

    function getSHReserve() public view returns (uint256) {
        return shreeToken.balanceOf(address(this));
    }

    function getETHReserve() public view returns (uint256) {
        return address(this).balance;
    }

    function addLiquidity(uint256 _amountSH) external payable nonReentrant returns (uint256 liquidityShares) {
        uint256 shReserve = getSHReserve();
        uint256 ethReserve = getETHReserve() - msg.value; // exclude current deposit

        if (totalLiquidity == 0) {
            require(_amountSH > 0 && msg.value > 0, "Initial liquidity must be non-zero");
            liquidityShares = msg.value; // simple initial share calculation
        } else {
            uint256 ethRatio = (msg.value * totalLiquidity) / ethReserve;
            uint256 shRatio = (_amountSH * totalLiquidity) / shReserve;
            liquidityShares = ethRatio < shRatio ? ethRatio : shRatio;
            require(liquidityShares > 0, "Zero liquidity added");
        }

        liquidity[msg.sender] += liquidityShares;
        totalLiquidity += liquidityShares;

        require(shreeToken.transferFrom(msg.sender, address(this), _amountSH), "SH transfer failed");

        emit LiquidityAdded(msg.sender, _amountSH, msg.value, liquidityShares);
        return liquidityShares;
    }

    function removeLiquidity(uint256 _liquidityShares) external nonReentrant returns (uint256 amountSH, uint256 amountETH) {
        require(_liquidityShares > 0, "Shares must be > 0");
        require(liquidity[msg.sender] >= _liquidityShares, "Insufficient liquidity shares");

        uint256 shReserve = getSHReserve();
        uint256 ethReserve = getETHReserve();

        amountETH = (_liquidityShares * ethReserve) / totalLiquidity;
        amountSH = (_liquidityShares * shReserve) / totalLiquidity;

        liquidity[msg.sender] -= _liquidityShares;
        totalLiquidity -= _liquidityShares;

        require(shreeToken.transfer(msg.sender, amountSH), "SH transfer failed");
        (bool success, ) = msg.sender.call{value: amountETH}("");
        require(success, "ETH transfer failed");

        emit LiquidityRemoved(msg.sender, amountSH, amountETH, _liquidityShares);
    }

    function getOutputAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) public pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "Invalid reserves");
        uint256 inputAmountWithFee = inputAmount * (FEE_DENOMINATOR - FEE_PERCENT);
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * FEE_DENOMINATOR) + inputAmountWithFee;
        return numerator / denominator;
    }

    function swapSHForETH(uint256 _amountSH, uint256 _minAmountETH) external nonReentrant returns (uint256 amountETH) {
        require(_amountSH > 0, "Invalid SH amount");
        uint256 shReserve = getSHReserve();
        uint256 ethReserve = getETHReserve();
        
        amountETH = getOutputAmount(_amountSH, shReserve, ethReserve);
        require(amountETH >= _minAmountETH, "Slippage exceeded");
        require(amountETH < ethReserve, "Insufficient ETH liquidity");

        require(shreeToken.transferFrom(msg.sender, address(this), _amountSH), "SH transfer failed");
        (bool success, ) = msg.sender.call{value: amountETH}("");
        require(success, "ETH transfer failed");

        emit Swap(msg.sender, _amountSH, amountETH, true);
    }

    function swapETHForSH(uint256 _minAmountSH) external payable nonReentrant returns (uint256 amountSH) {
        require(msg.value > 0, "Invalid ETH amount");
        uint256 ethReserve = getETHReserve() - msg.value;
        uint256 shReserve = getSHReserve();
        
        amountSH = getOutputAmount(msg.value, ethReserve, shReserve);
        require(amountSH >= _minAmountSH, "Slippage exceeded");
        require(amountSH < shReserve, "Insufficient SH liquidity");

        require(shreeToken.transfer(msg.sender, amountSH), "SH transfer failed");

        emit Swap(msg.sender, msg.value, amountSH, false);
    }

    function getSHPrice() external view returns (uint256) {
        uint256 shReserve = getSHReserve();
        uint256 ethReserve = getETHReserve();
        if (shReserve == 0) return 0;
        return (ethReserve * 1e18) / shReserve; // Price of 1 SH in wei
    }

    function getETHPrice() external view returns (uint256) {
        uint256 shReserve = getSHReserve();
        uint256 ethReserve = getETHReserve();
        if (ethReserve == 0) return 0;
        return (shReserve * 1e18) / ethReserve; // Price of 1 ETH in SH units (wei scale)
    }

    receive() external payable {}
}
