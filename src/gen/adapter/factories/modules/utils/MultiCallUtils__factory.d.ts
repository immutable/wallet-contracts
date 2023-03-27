import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type { MultiCallUtils, MultiCallUtilsInterface } from "../../../modules/utils/MultiCallUtils";
type MultiCallUtilsConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class MultiCallUtils__factory extends ContractFactory {
    constructor(...args: MultiCallUtilsConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<MultiCallUtils>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): MultiCallUtils;
    connect(signer: Signer): MultiCallUtils__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b5061102c806100206000396000f3fe6080604052600436106100e85760003560e01c8063c272d5c31161008a578063d5b5337f11610059578063d5b5337f1461030e578063e90f13e71461034b578063f209883a14610376578063ffd7d741146103a1576100e8565b8063c272d5c31461023e578063c39f2d5c14610269578063c66764e1146102a6578063d1db3907146102e3576100e8565b8063543196eb116100c6578063543196eb14610180578063984395bc146101bd57806398f9fbc4146101e8578063aeea5fb514610213576100e8565b80630fdecfac146100ed57806343d9c9351461011857806348acd29f14610143575b600080fd5b3480156100f957600080fd5b506101026103d2565b60405161010f9190610da7565b60405180910390f35b34801561012457600080fd5b5061012d6103da565b60405161013a9190610da7565b60405180910390f35b34801561014f57600080fd5b5061016a600480360381019061016591906108fe565b6103e2565b6040516101779190610da7565b60405180910390f35b34801561018c57600080fd5b506101a760048036038101906101a291906108fe565b610403565b6040516101b49190610d0a565b60405180910390f35b3480156101c957600080fd5b506101d261040e565b6040516101df9190610cb8565b60405180910390f35b3480156101f457600080fd5b506101fd610416565b60405161020a9190610cb8565b60405180910390f35b34801561021f57600080fd5b5061022861041e565b6040516102359190610da7565b60405180910390f35b34801561024a57600080fd5b50610253610426565b6040516102609190610da7565b60405180910390f35b34801561027557600080fd5b50610290600480360381019061028b91906108fe565b61042e565b60405161029d9190610da7565b60405180910390f35b3480156102b257600080fd5b506102cd60048036038101906102c891906108fe565b610439565b6040516102da9190610d25565b60405180910390f35b3480156102ef57600080fd5b506102f8610464565b6040516103059190610da7565b60405180910390f35b34801561031a57600080fd5b5061033560048036038101906103309190610968565b61046c565b6040516103429190610d0a565b60405180910390f35b34801561035757600080fd5b50610360610477565b60405161036d9190610da7565b60405180910390f35b34801561038257600080fd5b5061038b61047f565b6040516103989190610da7565b60405180910390f35b6103bb60048036038101906103b69190610927565b610487565b6040516103c9929190610cd3565b60405180910390f35b600046905090565b60005a905090565b60008173ffffffffffffffffffffffffffffffffffffffff16319050919050565b6000813f9050919050565b600032905090565b600041905090565b600044905090565b60003a905090565b6000813b9050919050565b6060813b6040519150601f19601f602083010116820160405280825280600060208401853c50919050565b600045905090565b600081409050919050565b600045905090565b600042905090565b606080825167ffffffffffffffff811180156104a257600080fd5b506040519080825280602002602001820160405280156104d15781602001602082028036833780820191505090505b509150825167ffffffffffffffff811180156104ec57600080fd5b5060405190808252806020026020018201604052801561052057816020015b606081526020019060019003908161050b5790505b50905060005b835181101561071657600084828151811061053d57fe5b6020026020010151905080600001511561058c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161058390610d87565b60405180910390fd5b80604001515a10156105d3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105ca90610d67565b60405180910390fd5b806060015173ffffffffffffffffffffffffffffffffffffffff168160800151600083604001511461060957826040015161060b565b5a5b908360a0015160405161061e9190610ca1565b600060405180830381858888f193505050503d806000811461065c576040519150601f19603f3d011682016040523d82523d6000602084013e610661565b606091505b5085848151811061066e57fe5b6020026020010185858151811061068157fe5b60200260200101829052821515151581525050508382815181106106a157fe5b6020026020010151806106c957508482815181106106bb57fe5b602002602001015160200151155b610708576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106ff90610d47565b60405180910390fd5b508080600101915050610526565b50915091565b600061072f61072a84610df3565b610dc2565b9050808382526020820190508260005b8581101561076f57813585016107558882610835565b84526020840193506020830192505060018101905061073f565b5050509392505050565b600061078c61078784610e1f565b610dc2565b9050828152602081018484840111156107a457600080fd5b6107af848285610f5c565b509392505050565b6000813590506107c681610fb1565b92915050565b600082601f8301126107dd57600080fd5b81356107ed84826020860161071c565b91505092915050565b60008135905061080581610fc8565b92915050565b600082601f83011261081c57600080fd5b813561082c848260208601610779565b91505092915050565b600060c0828403121561084757600080fd5b61085160c0610dc2565b90506000610861848285016107f6565b6000830152506020610875848285016107f6565b6020830152506040610889848285016108e9565b604083015250606061089d848285016107b7565b60608301525060806108b1848285016108e9565b60808301525060a082013567ffffffffffffffff8111156108d157600080fd5b6108dd8482850161080b565b60a08301525092915050565b6000813590506108f881610fdf565b92915050565b60006020828403121561091057600080fd5b600061091e848285016107b7565b91505092915050565b60006020828403121561093957600080fd5b600082013567ffffffffffffffff81111561095357600080fd5b61095f848285016107cc565b91505092915050565b60006020828403121561097a57600080fd5b6000610988848285016108e9565b91505092915050565b600061099d8383610a9f565b60208301905092915050565b60006109b58383610abd565b905092915050565b6109c681610f0a565b82525050565b60006109d782610e6f565b6109e18185610eaa565b93506109ec83610e4f565b8060005b83811015610a1d578151610a048882610991565b9750610a0f83610e90565b9250506001810190506109f0565b5085935050505092915050565b6000610a3582610e7a565b610a3f8185610ebb565b935083602082028501610a5185610e5f565b8060005b85811015610a8d5784840389528151610a6e85826109a9565b9450610a7983610e9d565b925060208a01995050600181019050610a55565b50829750879550505050505092915050565b610aa881610f1c565b82525050565b610ab781610f28565b82525050565b6000610ac882610e85565b610ad28185610ecc565b9350610ae2818560208601610f6b565b610aeb81610fa0565b840191505092915050565b6000610b0182610e85565b610b0b8185610edd565b9350610b1b818560208601610f6b565b610b2481610fa0565b840191505092915050565b6000610b3a82610e85565b610b448185610eee565b9350610b54818560208601610f6b565b80840191505092915050565b6000610b6d602783610ef9565b91507f4d756c746943616c6c5574696c73236d756c746943616c6c3a2043414c4c5f5260008301527f45564552544544000000000000000000000000000000000000000000000000006020830152604082019050919050565b6000610bd3602883610ef9565b91507f4d756c746943616c6c5574696c73236d756c746943616c6c3a204e4f545f454e60008301527f4f5547485f4741530000000000000000000000000000000000000000000000006020830152604082019050919050565b6000610c39603283610ef9565b91507f4d756c746943616c6c5574696c73236d756c746943616c6c3a2064656c65676160008301527f746543616c6c206e6f7420616c6c6f77656400000000000000000000000000006020830152604082019050919050565b610c9b81610f52565b82525050565b6000610cad8284610b2f565b915081905092915050565b6000602082019050610ccd60008301846109bd565b92915050565b60006040820190508181036000830152610ced81856109cc565b90508181036020830152610d018184610a2a565b90509392505050565b6000602082019050610d1f6000830184610aae565b92915050565b60006020820190508181036000830152610d3f8184610af6565b905092915050565b60006020820190508181036000830152610d6081610b60565b9050919050565b60006020820190508181036000830152610d8081610bc6565b9050919050565b60006020820190508181036000830152610da081610c2c565b9050919050565b6000602082019050610dbc6000830184610c92565b92915050565b6000604051905081810181811067ffffffffffffffff82111715610de957610de8610f9e565b5b8060405250919050565b600067ffffffffffffffff821115610e0e57610e0d610f9e565b5b602082029050602081019050919050565b600067ffffffffffffffff821115610e3a57610e39610f9e565b5b601f19601f8301169050602081019050919050565b6000819050602082019050919050565b6000819050602082019050919050565b600081519050919050565b600081519050919050565b600081519050919050565b6000602082019050919050565b6000602082019050919050565b600082825260208201905092915050565b600082825260208201905092915050565b600082825260208201905092915050565b600082825260208201905092915050565b600081905092915050565b600082825260208201905092915050565b6000610f1582610f32565b9050919050565b60008115159050919050565b6000819050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b82818337600083830152505050565b60005b83811015610f89578082015181840152602081019050610f6e565b83811115610f98576000848401525b50505050565bfe5b6000601f19601f8301169050919050565b610fba81610f0a565b8114610fc557600080fd5b50565b610fd181610f1c565b8114610fdc57600080fd5b50565b610fe881610f52565b8114610ff357600080fd5b5056fea2646970667358221220470b979e820b73ca30a2af7020c52ed96f40cf21442aec67daf16ee9688a31de64736f6c63430007060033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callBalanceOf";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callBlockNumber";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "_i";
            readonly type: "uint256";
        }];
        readonly name: "callBlockhash";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callChainId";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "id";
            readonly type: "uint256";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callCode";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "code";
            readonly type: "bytes";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callCodeHash";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "codeHash";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "callCodeSize";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "size";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callCoinbase";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callDifficulty";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callGasLeft";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callGasLimit";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callGasPrice";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callOrigin";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "callTimestamp";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "bool";
                readonly name: "delegateCall";
                readonly type: "bool";
            }, {
                readonly internalType: "bool";
                readonly name: "revertOnError";
                readonly type: "bool";
            }, {
                readonly internalType: "uint256";
                readonly name: "gasLimit";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "target";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "value";
                readonly type: "uint256";
            }, {
                readonly internalType: "bytes";
                readonly name: "data";
                readonly type: "bytes";
            }];
            readonly internalType: "struct IModuleCalls.Transaction[]";
            readonly name: "_txs";
            readonly type: "tuple[]";
        }];
        readonly name: "multiCall";
        readonly outputs: readonly [{
            readonly internalType: "bool[]";
            readonly name: "_successes";
            readonly type: "bool[]";
        }, {
            readonly internalType: "bytes[]";
            readonly name: "_results";
            readonly type: "bytes[]";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }];
    static createInterface(): MultiCallUtilsInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): MultiCallUtils;
}
export {};
