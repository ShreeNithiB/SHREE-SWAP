// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SHREE is ERC20 {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;

    constructor() ERC20("SHREE", "SH") {
        // Mint initial 500,000 SH tokens
        _mint(msg.sender, 500_000 * 10 ** 18);
    }
}
