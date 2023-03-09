import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type { Factory, FactoryInterface } from "../Factory";
type FactoryConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class Factory__factory extends ContractFactory {
    constructor(...args: FactoryConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<Factory>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): Factory;
    connect(signer: Signer): Factory__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b5061002d61002261003260201b60201c565b61003a60201b60201c565b6100fe565b600033905090565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b610a098061010d6000396000f3fe60806040526004361061004a5760003560e01c806332c02a141461004f578063715018a61461007f5780637ac4ed64146100965780638da5cb5b146100d3578063f2fde38b146100fe575b600080fd5b610069600480360381019061006491906105a7565b610127565b60405161007691906105f6565b60405180910390f35b34801561008b57600080fd5b5061009461026b565b005b3480156100a257600080fd5b506100bd60048036038101906100b891906105a7565b61027f565b6040516100ca91906105f6565b60405180910390f35b3480156100df57600080fd5b506100e8610318565b6040516100f591906105f6565b60405180910390f35b34801561010a57600080fd5b5061012560048036038101906101209190610611565b610341565b005b60006101316103c4565b60006040518060600160405280602881526020016109ac602891398473ffffffffffffffffffffffffffffffffffffffff166040516020016101749291906106da565b60405160208183030381529060405290508281516020830134f59150600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036101ff576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101f69061075f565b60405180910390fd5b8373ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff167f195bcaf5c86c75410014291983a0bc0b60a4ae2874ff863699229144c361a2168560405161025c919061078e565b60405180910390a35092915050565b6102736103c4565b61027d6000610442565b565b60008060ff60f81b30846040518060600160405280602881526020016109ac602891398773ffffffffffffffffffffffffffffffffffffffff166040516020016102ca9291906106da565b604051602081830303815290604052805190602001206040516020016102f3949392919061085f565b6040516020818303038152906040528051906020012090508060001c91505092915050565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6103496103c4565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16036103b8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103af9061091f565b60405180910390fd5b6103c181610442565b50565b6103cc610506565b73ffffffffffffffffffffffffffffffffffffffff166103ea610318565b73ffffffffffffffffffffffffffffffffffffffff1614610440576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104379061098b565b60405180910390fd5b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b600033905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061053e82610513565b9050919050565b61054e81610533565b811461055957600080fd5b50565b60008135905061056b81610545565b92915050565b6000819050919050565b61058481610571565b811461058f57600080fd5b50565b6000813590506105a18161057b565b92915050565b600080604083850312156105be576105bd61050e565b5b60006105cc8582860161055c565b92505060206105dd85828601610592565b9150509250929050565b6105f081610533565b82525050565b600060208201905061060b60008301846105e7565b92915050565b6000602082840312156106275761062661050e565b5b60006106358482850161055c565b91505092915050565b600081519050919050565b600081905092915050565b60005b83811015610672578082015181840152602081019050610657565b60008484015250505050565b60006106898261063e565b6106938185610649565b93506106a3818560208601610654565b80840191505092915050565b6000819050919050565b6000819050919050565b6106d46106cf826106af565b6106b9565b82525050565b60006106e6828561067e565b91506106f282846106c3565b6020820191508190509392505050565b600082825260208201905092915050565b7f57616c6c6574466163746f72793a206465706c6f796d656e74206661696c6564600082015250565b6000610749602083610702565b915061075482610713565b602082019050919050565b600060208201905081810360008301526107788161073c565b9050919050565b61078881610571565b82525050565b60006020820190506107a3600083018461077f565b92915050565b60007fff0000000000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b6107f06107eb826107a9565b6107d5565b82525050565b60008160601b9050919050565b600061080e826107f6565b9050919050565b600061082082610803565b9050919050565b61083861083382610533565b610815565b82525050565b6000819050919050565b61085961085482610571565b61083e565b82525050565b600061086b82876107df565b60018201915061087b8286610827565b60148201915061088b8285610848565b60208201915061089b8284610848565b60208201915081905095945050505050565b7f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160008201527f6464726573730000000000000000000000000000000000000000000000000000602082015250565b6000610909602683610702565b9150610914826108ad565b604082019050919050565b60006020820190508181036000830152610938816108fc565b9050919050565b7f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572600082015250565b6000610975602083610702565b91506109808261093f565b602082019050919050565b600060208201905081810360008301526109a481610968565b905091905056fe603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3a26469706673582212206fb2d8763a13c05cc0b5fbeb3cbdf3dd9ac6ea0d4682dee280c1ebb0fd30b33164736f6c63430008110033";
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "previousOwner";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newOwner";
            readonly type: "address";
        }];
        readonly name: "OwnershipTransferred";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "wallet";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "mainModule";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }];
        readonly name: "WalletDeployed";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_mainModule";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "_salt";
            readonly type: "bytes32";
        }];
        readonly name: "deploy";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "_contract";
            readonly type: "address";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_mainModule";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "_salt";
            readonly type: "bytes32";
        }];
        readonly name: "getAddress";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "_address";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "owner";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "renounceOwnership";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "newOwner";
            readonly type: "address";
        }];
        readonly name: "transferOwnership";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): FactoryInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): Factory;
}
export {};
