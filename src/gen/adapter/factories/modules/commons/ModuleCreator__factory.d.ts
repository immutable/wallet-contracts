import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type { ModuleCreator, ModuleCreatorInterface } from "../../../modules/commons/ModuleCreator";
type ModuleCreatorConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ModuleCreator__factory extends ContractFactory {
    constructor(...args: ModuleCreatorConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ModuleCreator>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): ModuleCreator;
    connect(signer: Signer): ModuleCreator__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b50610395806100206000396000f3fe6080604052600436106100295760003560e01c806301ffc9a71461002e57806390042baf1461009e575b600080fd5b34801561003a57600080fd5b506100866004803603602081101561005157600080fd5b8101908080357bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19169060200190929190505050610183565b60405180821515815260200191505060405180910390f35b610157600480360360208110156100b457600080fd5b81019080803590602001906401000000008111156100d157600080fd5b8201836020820111156100e357600080fd5b8035906020019184600183028401116401000000008311171561010557600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290505050610205565b604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b60007f90042baf000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614156101f45760019050610200565b6101fd826102e7565b90505b919050565b60003073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461028b576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260278152602001806103396027913960400191505060405180910390fd5b81516020830134f090507fa506ad4e7f05eceba62a023c3219e5bd98a615f4fa87e2afb08a2da5cf62bf0c81604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390a1919050565b60006301ffc9a760e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614905091905056fe4d6f64756c6553656c6641757468236f6e6c7953656c663a204e4f545f415554484f52495a4544a26469706673582212203de8850a50b8ef3787ff7dac8cbbf2ae7222db27aeddbf225396b0f2d4c5850464736f6c63430007060033";
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "_contract";
            readonly type: "address";
        }];
        readonly name: "CreatedContract";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "_code";
            readonly type: "bytes";
        }];
        readonly name: "createContract";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "addr";
            readonly type: "address";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "_interfaceID";
            readonly type: "bytes4";
        }];
        readonly name: "supportsInterface";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
    static createInterface(): ModuleCreatorInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): ModuleCreator;
}
export {};
