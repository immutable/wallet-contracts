import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { HookCallerMock, HookCallerMockInterface } from "../../mocks/HookCallerMock";
type HookCallerMockConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class HookCallerMock__factory extends ContractFactory {
    constructor(...args: HookCallerMockConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<HookCallerMock>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): HookCallerMock;
    connect(signer: Signer): HookCallerMock__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b50610e37806100206000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806326b5a86a146100675780632a201004146100ab5780635b6571511461014e5780636d1d4996146101925780637510d9ec146101d6578063bf900e2c1461021a575b600080fd5b6100a96004803603602081101561007d57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610308565b005b61014c600480360360608110156100c157600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291908035906020019064010000000081111561010857600080fd5b82018360208201111561011a57600080fd5b8035906020019184600183028401116401000000008311171561013c57600080fd5b9091929391929390505050610655565b005b6101906004803603602081101561016457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919050505061079e565b005b6101d4600480360360208110156101a857600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610860565b005b610218600480360360208110156101ec57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506109ef565b005b6103066004803603606081101561023057600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019064010000000081111561026d57600080fd5b82018360208201111561027f57600080fd5b803590602001918460018302840111640100000000831117156102a157600080fd5b9091929391929390803590602001906401000000008111156102c257600080fd5b8201836020820111156102d457600080fd5b803590602001918460018302840111640100000000831117156102f657600080fd5b9091929391929390505050610b75565b005b6000600367ffffffffffffffff8111801561032257600080fd5b506040519080825280602002602001820160405280156103515781602001602082028036833780820191505090505b50905060018160008151811061036357fe5b60200260200101818152505060028160018151811061037e57fe5b60200260200101818152505060038160028151811061039957fe5b6020026020010181815250506000600367ffffffffffffffff811180156103bf57600080fd5b506040519080825280602002602001820160405280156103ee5781602001602082028036833780820191505090505b50905060c88160008151811061040057fe5b60200260200101818152505061012c8160018151811061041c57fe5b6020026020010181815250506101908160028151811061043857fe5b60200260200101818152505060008373ffffffffffffffffffffffffffffffffffffffff1663bc197c81303386866000366040518763ffffffff1660e01b8152600401808773ffffffffffffffffffffffffffffffffffffffff1681526020018673ffffffffffffffffffffffffffffffffffffffff168152602001806020018060200180602001848103845288818151815260200191508051906020019060200280838360005b838110156104fb5780820151818401526020810190506104e0565b50505050905001848103835287818151815260200191508051906020019060200280838360005b8381101561053d578082015181840152602081019050610522565b505050509050018481038252868682818152602001925080828437600081840152601f19601f8201169050808301925050509950505050505050505050602060405180830381600087803b15801561059457600080fd5b505af11580156105a8573d6000803e3d6000fd5b505050506040513d60208110156105be57600080fd5b8101908080519060200190929190505050905063bc197c8160e01b817bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161461064f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526037815260200180610dcb6037913960400191505060405180910390fd5b50505050565b60008473ffffffffffffffffffffffffffffffffffffffff16631626ba7e8585856040518463ffffffff1660e01b815260040180848152602001806020018281038252848482818152602001925080828437600081840152601f19601f82011690508083019250505094505050505060206040518083038186803b1580156106dc57600080fd5b505afa1580156106f0573d6000803e3d6000fd5b505050506040513d602081101561070657600080fd5b81019080805190602001909291905050509050631626ba7e60e01b817bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614610797576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603e815260200180610d8d603e913960400191505060405180910390fd5b5050505050565b8073ffffffffffffffffffffffffffffffffffffffff1663c0ee0b8a3360016000366040518563ffffffff1660e01b8152600401808573ffffffffffffffffffffffffffffffffffffffff168152602001848152602001806020018281038252848482818152602001925080828437600081840152601f19601f82011690508083019250505095505050505050600060405180830381600087803b15801561084557600080fd5b505af1158015610859573d6000803e3d6000fd5b5050505050565b60008173ffffffffffffffffffffffffffffffffffffffff1663f23a6e613033600160026000366040518763ffffffff1660e01b8152600401808773ffffffffffffffffffffffffffffffffffffffff1681526020018673ffffffffffffffffffffffffffffffffffffffff168152602001858152602001848152602001806020018281038252848482818152602001925080828437600081840152601f19601f820116905080830192505050975050505050505050602060405180830381600087803b15801561093057600080fd5b505af1158015610944573d6000803e3d6000fd5b505050506040513d602081101561095a57600080fd5b8101908080519060200190929190505050905063f23a6e6160e01b817bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916146109eb576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526032815260200180610d5b6032913960400191505060405180910390fd5b5050565b60008173ffffffffffffffffffffffffffffffffffffffff1663150b7a02303360016000366040518663ffffffff1660e01b8152600401808673ffffffffffffffffffffffffffffffffffffffff1681526020018573ffffffffffffffffffffffffffffffffffffffff168152602001848152602001806020018281038252848482818152602001925080828437600081840152601f19601f8201169050808301925050509650505050505050602060405180830381600087803b158015610ab657600080fd5b505af1158015610aca573d6000803e3d6000fd5b505050506040513d6020811015610ae057600080fd5b8101908080519060200190929190505050905063150b7a0260e01b817bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614610b71576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526031815260200180610d2a6031913960400191505060405180910390fd5b5050565b60008573ffffffffffffffffffffffffffffffffffffffff166320c13b0b868686866040518563ffffffff1660e01b81526004018080602001806020018381038352878782818152602001925080828437600081840152601f19601f8201169050808301925050508381038252858582818152602001925080828437600081840152601f19601f820116905080830192505050965050505050505060206040518083038186803b158015610c2857600080fd5b505afa158015610c3c573d6000803e3d6000fd5b505050506040513d6020811015610c5257600080fd5b810190808051906020019092919050505090506320c13b0b60e01b817bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614610ce3576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603e815260200180610cec603e913960400191505060405180910390fd5b50505050505056fe486f6f6b43616c6c65724d6f636b2363616c6c45524331323731697356616c69645369676e6174757265446174613a20494e56414c49445f52455455524e486f6f6b43616c6c65724d6f636b2363616c6c45524337323152656365697665643a20494e56414c49445f52455455524e486f6f6b43616c6c65724d6f636b2363616c6c4552433131353552656365697665643a20494e56414c49445f52455455524e486f6f6b43616c6c65724d6f636b2363616c6c45524331323731697356616c69645369676e6174757265486173683a20494e56414c49445f52455455524e486f6f6b43616c6c65724d6f636b2363616c6c45524331313535426174636852656365697665643a20494e56414c49445f52455455524ea264697066735822122085499ae3c0d131a5a803a65831939cadd9bdc9d125496688b5a10a244266cba764736f6c63430007060033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callERC1155BatchReceived";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callERC1155Received";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }, {
            readonly internalType: "bytes";
            readonly name: "_data";
            readonly type: "bytes";
        }, {
            readonly internalType: "bytes";
            readonly name: "_signature";
            readonly type: "bytes";
        }];
        readonly name: "callERC1271isValidSignatureData";
        readonly outputs: readonly [];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "_hash";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes";
            readonly name: "_signature";
            readonly type: "bytes";
        }];
        readonly name: "callERC1271isValidSignatureHash";
        readonly outputs: readonly [];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callERC223Received";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callERC721Received";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): HookCallerMockInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): HookCallerMock;
}
export {};
