import { ethers, BytesLike, BigNumberish } from 'ethers'

// This bytecode must precisely match that in src/contracts/Wallet.sol
// Original Sequence wallet proxy
// export const WALLET_CODE = '0x603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3'
// Solidity wallet proxy with PROXY_getImplementation
//export const WALLET_CODE = '0x608060405234801561001057600080fd5b5060405161029f38038061029f8339818101604052810190610032919061009e565b803055506100cb565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061006b82610040565b9050919050565b61007b81610060565b811461008657600080fd5b50565b60008151905061009881610072565b92915050565b6000602082840312156100b4576100b361003b565b5b60006100c284828501610089565b91505092915050565b6101c5806100da6000396000f3fe6080604052600436106100225760003560e01c806390611127146100a857610076565b36610076573373ffffffffffffffffffffffffffffffffffffffff16347f606834f57405380c4fb88d1f4850326ad3885f014bab3b568dfbf7a041eef73860405161006c90610113565b60405180910390a3005b60006100806100d3565b90503660008037600080366000845af43d6000803e80600081146100a3573d6000f35b3d6000fd5b3480156100b457600080fd5b506100bd6100d3565b6040516100ca9190610174565b60405180910390f35b60003054905090565b600082825260208201905092915050565b50565b60006100fd6000836100dc565b9150610108826100ed565b600082019050919050565b6000602082019050818103600083015261012c816100f0565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061015e82610133565b9050919050565b61016e81610153565b82525050565b60006020820190506101896000830184610165565b9291505056fea2646970667358221220d43fa02972046db2bc81804ebf600d5b46b97e55c738ea899a28224e111b588564736f6c63430008110033'
// Yul wallet proxy with PROXY_getImplementation
export const WALLET_CODE = '0x6054600f3d396034805130553df3fe63906111273d3560e01c14602b57363d3d373d3d3d3d369030545af43d82803e156027573d90f35b3d90fd5b30543d5260203df3'

export function compareAddr(a: string | ethers.Wallet, b: string | ethers.Wallet) {
    const addrA = typeof a === 'string' ? a : a.address
    const addrB = typeof b === 'string' ? b : b.address

    const bigA = ethers.BigNumber.from(addrA)
    const bigB = ethers.BigNumber.from(addrB)

    if (bigA.lt(bigB)) {
        return -1
    } else if (bigA.eq(bigB)) {
        return 0
    } else {
        return 1
    }
}

export function addressOf(
    factory: string,
    mainModule: string,
    imageHash: string
): string {
    const codeHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ['bytes', 'bytes32'],
            [WALLET_CODE, ethers.utils.hexZeroPad(mainModule, 32)]
        )
    )

    const hash = ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ['bytes1', 'address', 'bytes32', 'bytes32'],
            ['0xff', factory, imageHash, codeHash]
        )
    )

    return ethers.utils.getAddress(ethers.utils.hexDataSlice(hash, 12))
}

export function encodeImageHash(
    threshold: BigNumberish,
    accounts: {
        weight: BigNumberish
        address: string
    }[]
) {
    const sorted = accounts.sort((a, b) => compareAddr(a.address, b.address))
    let imageHash = ethers.utils.solidityPack(['uint256'], [threshold])

    sorted.forEach((a) =>
        imageHash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['bytes32', 'uint8', 'address'],
                [imageHash, a.weight, a.address]
            )
        )
    )

    return imageHash
}

export function encodeMessageData(
    owner: string,
    message: string,
    networkId: BigNumberish
): string {
    return encodeMessageSubDigest(owner, ethers.utils.keccak256(message), networkId)
}

export function encodeMessageSubDigest(
    owner: string,
    digest: string,
    networkId: BigNumberish
): string {
    return ethers.utils.solidityPack(
        ['string', 'uint256', 'address', 'bytes32'],
        ['\x19\x01', networkId, owner, digest]
    )
}

// Take a message, hash it and sign it with ETH_SIGN SignatureType
export async function ethSign(wallet: ethers.Wallet, message: string | Uint8Array, hashed = false) {
    let hash = hashed ? message : ethers.utils.keccak256(message)
    let hashArray = ethers.utils.arrayify(hash)
    let ethsigNoType = await wallet.signMessage(hashArray)
    return ethsigNoType.endsWith('03') || ethsigNoType.endsWith('02') ? ethsigNoType : ethsigNoType + '02'
}

export const MetaTransactionsType = `tuple(
    bool delegateCall,
    bool revertOnError,
    uint256 gasLimit,
    address target,
    uint256 value,
    bytes data
  )[]`

export function encodeMetaTransactionsData(
    owner: string,
    txs: {
        delegateCall: boolean;
        revertOnError: boolean;
        gasLimit: BigNumberish;
        target: string;
        value: BigNumberish;
        data: BytesLike;
    }[],
    networkId: BigNumberish,
    nonce: BigNumberish
): string {
    const transactions = ethers.utils.defaultAbiCoder.encode(['uint256', MetaTransactionsType], [nonce, txs])
    return encodeMessageData(owner, transactions, networkId)
}

export async function walletMultiSign(
    accounts: {
        weight: BigNumberish,
        owner: string | ethers.Wallet,
        signature?: string
    }[],
    threshold: BigNumberish,
    message: string,
    forceDynamicSize: boolean = false,
    hashed = false
) {
    const sorted = accounts.sort((a, b) => compareAddr(a.owner, b.owner))
    const accountBytes = await Promise.all(
        sorted.map(async (a) => {
            if (typeof a.owner === 'string' && !a.signature) {
                return ethers.utils.solidityPack(
                    ['uint8', 'uint8', 'address'],
                    [1, a.weight, a.owner]
                )
            } else {
                const signature = ethers.utils.arrayify(a.signature ? a.signature as string : await ethSign(a.owner as ethers.Wallet, message, hashed))
                if (forceDynamicSize || signature.length !== 66) {
                    const address = typeof a.owner === 'string' ? a.owner : a.owner.address
                    return ethers.utils.solidityPack(
                        ['uint8', 'uint8', 'address', 'uint16', 'bytes'],
                        [2, a.weight, address, signature.length, signature]
                    )
                } else {
                    return ethers.utils.solidityPack(
                        ['uint8', 'uint8', 'bytes'],
                        [0, a.weight, signature]
                    )
                }
            }
        })
    )

    return ethers.utils.solidityPack(
        ['uint16', ...Array(accounts.length).fill('bytes')],
        [threshold, ...accountBytes]
    )
}