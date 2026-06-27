// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract TestUSDTest is Test {
    TestUSD tok;
    uint256 buyerPk = 0xA11CE;
    address buyer;
    address payTo = address(0xBEEF);

    bytes32 constant TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    function setUp() public {
        tok = new TestUSD();
        buyer = vm.addr(buyerPk);
        tok.mint(buyer, 100 * 1e6);
    }

    function _sign(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(TYPEHASH, from, to, value, validAfter, validBefore, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", tok.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(buyerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function testMintAndCap() public {
        tok.mint(payTo, 1_000 * 1e6);
        assertEq(tok.balanceOf(payTo), 1_000 * 1e6);
        vm.expectRevert("tmUSD: over faucet cap");
        tok.mint(payTo, 1_001 * 1e6);
    }

    function testTransferWithAuthorization() public {
        bytes32 nonce = keccak256("n1");
        uint256 value = 10 * 1e6;
        bytes memory sig = _sign(buyer, payTo, value, 0, block.timestamp + 3600, nonce);

        tok.transferWithAuthorization(buyer, payTo, value, 0, block.timestamp + 3600, nonce, sig);
        assertEq(tok.balanceOf(payTo), value);
        assertEq(tok.balanceOf(buyer), 90 * 1e6);
        assertTrue(tok.authorizationState(buyer, nonce));
    }

    function testReplayRejected() public {
        bytes32 nonce = keccak256("n2");
        uint256 vb = block.timestamp + 3600;
        bytes memory sig = _sign(buyer, payTo, 5 * 1e6, 0, vb, nonce);
        tok.transferWithAuthorization(buyer, payTo, 5 * 1e6, 0, vb, nonce, sig);
        vm.expectRevert("tmUSD: auth used");
        tok.transferWithAuthorization(buyer, payTo, 5 * 1e6, 0, vb, nonce, sig);
    }

    function testExpiredRejected() public {
        bytes32 nonce = keccak256("n3");
        uint256 vb = block.timestamp + 100;
        bytes memory sig = _sign(buyer, payTo, 1e6, 0, vb, nonce);
        vm.warp(block.timestamp + 200);
        vm.expectRevert("tmUSD: auth expired");
        tok.transferWithAuthorization(buyer, payTo, 1e6, 0, vb, nonce, sig);
    }

    function testBadSignatureRejected() public {
        bytes32 nonce = keccak256("n4");
        uint256 vb = block.timestamp + 3600;
        // sign for value=1e6 but submit value=999e6 → digest mismatch → recovered signer != buyer
        bytes memory sig = _sign(buyer, payTo, 1e6, 0, vb, nonce);
        vm.expectRevert("tmUSD: bad signature");
        tok.transferWithAuthorization(buyer, payTo, 999 * 1e6, 0, vb, nonce, sig);
    }

    function testInsufficientBalanceRejected() public {
        bytes32 nonce = keccak256("n5");
        uint256 vb = block.timestamp + 3600;
        bytes memory sig = _sign(buyer, payTo, 200 * 1e6, 0, vb, nonce);
        vm.expectRevert("tmUSD: balance");
        tok.transferWithAuthorization(buyer, payTo, 200 * 1e6, 0, vb, nonce, sig);
    }
}
