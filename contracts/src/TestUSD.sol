// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title TestUSD (tmUSD) — MantleFlow x402 testnet settlement token
 * @notice A minimal ERC-20 with EIP-3009 `transferWithAuthorization` (gasless, authorized transfers)
 *         used to settle x402 pay-per-query on Mantle Sepolia. TESTNET ONLY — `mint` is a public,
 *         capped faucet and the token has NO real value. The x402 flow is identical to mainnet USDC
 *         (also EIP-3009); only the asset address + network differ, by config.
 * @dev Self-contained (no external deps). EIP-712 domain {name, "1", chainId, this}. Standards:
 *      EIP-20, EIP-3009 (https://eips.ethereum.org/EIPS/eip-3009), EIP-712, EIP-1271-not-supported.
 */
contract TestUSD {
    string public constant name = "MantleFlow Test USD";
    string public constant symbol = "tmUSD";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /** EIP-3009: authorizer => nonce => used. */
    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    /** Faucet cap per mint call (1,000 tmUSD). */
    uint256 public constant MAX_MINT = 1_000 * 1e6;

    bytes32 private constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN_TYPEHASH,
                    keccak256(bytes(name)),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(this)
                )
            );
    }

    // --- ERC-20 ---

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "tmUSD: allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    /** Public faucet — testnet only. Capped per call so anyone can grab demo tokens. */
    function mint(address to, uint256 amount) external {
        require(amount <= MAX_MINT, "tmUSD: over faucet cap");
        require(to != address(0), "tmUSD: zero");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // --- EIP-3009 ---

    /**
     * @notice Execute a transfer with a signed authorization (gasless for `from`). The x402 server
     *         submits this with the buyer's signature; the buyer pays no gas.
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        require(block.timestamp > validAfter, "tmUSD: auth not yet valid");
        require(block.timestamp < validBefore, "tmUSD: auth expired");
        require(!authorizationState[from][nonce], "tmUSD: auth used");

        bytes32 structHash = keccak256(
            abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        require(_recover(digest, signature) == from, "tmUSD: bad signature");

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);
        _transfer(from, to, value);
    }

    /** Cancel an unused authorization (the authorizer signs over the nonce). */
    function cancelAuthorization(address authorizer, bytes32 nonce, bytes calldata signature) external {
        require(!authorizationState[authorizer][nonce], "tmUSD: auth used");
        bytes32 structHash = keccak256(
            abi.encode(keccak256("CancelAuthorization(address authorizer,bytes32 nonce)"), authorizer, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        require(_recover(digest, signature) == authorizer, "tmUSD: bad signature");
        authorizationState[authorizer][nonce] = true;
        emit AuthorizationUsed(authorizer, nonce);
    }

    // --- internal ---

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "tmUSD: zero");
        uint256 bal = balanceOf[from];
        require(bal >= value, "tmUSD: balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "tmUSD: sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "tmUSD: bad v");
        require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "tmUSD: bad s");
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "tmUSD: zero signer");
        return signer;
    }
}
