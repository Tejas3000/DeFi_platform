// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract RiskEngine {
    function getRiskScore(address user) public pure returns (uint) {
        if (uint160(user) % 2 == 0) return 80;
        return 50;
    }
}
