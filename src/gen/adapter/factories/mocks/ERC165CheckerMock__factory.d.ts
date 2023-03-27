import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { ERC165CheckerMock, ERC165CheckerMockInterface } from "../../mocks/ERC165CheckerMock";
type ERC165CheckerMockConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ERC165CheckerMock__factory extends ContractFactory {
    constructor(...args: ERC165CheckerMockConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ERC165CheckerMock>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): ERC165CheckerMock;
    connect(signer: Signer): ERC165CheckerMock__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b506101d3806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063e9c5438414610030575b600080fd5b61009b6004803603604081101561004657600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080357bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191690602001909291905050506100b3565b60405180821515815260200191505060405180910390f35b60008060006100c9856301ffc9a760e01b610168565b809250819350505060008214806100e05750600081145b156100f057600092505050610162565b6101018563ffffffff60e01b610168565b80925081935050506000821480610119575060008114155b1561012957600092505050610162565b6101338585610168565b809250819350505060018214801561014b5750600181145b1561015b57600192505050610162565b6000925050505b92915050565b60008060006301ffc9a760e01b905060405181815284600482015260208160248389617530fa9350805192505050925092905056fea264697066735822122005268c6c60606e6ac04c34860e880031080a6641e6f53b6deafb4ca9f73640bd64736f6c63430007060033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_contract";
            readonly type: "address";
        }, {
            readonly internalType: "bytes4";
            readonly name: "_interfaceId";
            readonly type: "bytes4";
        }];
        readonly name: "doesContractImplementInterface";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): ERC165CheckerMockInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): ERC165CheckerMock;
}
export {};
