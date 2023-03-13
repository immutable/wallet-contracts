import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type { ModuleHooks, ModuleHooksInterface } from "../../../modules/commons/ModuleHooks";
declare type ModuleHooksConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ModuleHooks__factory extends ContractFactory {
    constructor(...args: ModuleHooksConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ModuleHooks>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): ModuleHooks;
    connect(signer: Signer): ModuleHooks__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b50610d7a806100206000396000f3fe6080604052600436106100745760003560e01c80634fcf3eca1161004e5780634fcf3eca14610366578063b93ea7ad146103c0578063bc197c811461043a578063f23a6e61146105dd5761007b565b806301ffc9a71461016f578063150b7a02146101df5780631a9b2337146102e25761007b565b3661007b57005b60006100aa6000357fffffffff00000000000000000000000000000000000000000000000000000000166106ea565b9050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161461016c576000808273ffffffffffffffffffffffffffffffffffffffff16600036604051808383808284378083019250505092505050600060405180830381855af49150503d806000811461014d576040519150601f19603f3d011682016040523d82523d6000602084013e610152565b606091505b50915091508161016457805160208201fd5b805160208201f35b50005b34801561017b57600080fd5b506101c76004803603602081101561019257600080fd5b8101908080357bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19169060200190929190505050610742565b60405180821515815260200191505060405180910390f35b3480156101eb57600080fd5b506102ad6004803603608081101561020257600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291908035906020019064010000000081111561026957600080fd5b82018360208201111561027b57600080fd5b8035906020019184600183028401116401000000008311171561029d57600080fd5b90919293919293905050506108fc565b60405180827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916815260200191505060405180910390f35b3480156102ee57600080fd5b5061033a6004803603602081101561030557600080fd5b8101908080357bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19169060200190929190505050610911565b604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b34801561037257600080fd5b506103be6004803603602081101561038957600080fd5b8101908080357bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19169060200190929190505050610923565b005b3480156103cc57600080fd5b50610438600480360360408110156103e357600080fd5b8101908080357bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610a43565b005b34801561044657600080fd5b506105a8600480360360a081101561045d57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001906401000000008111156104ba57600080fd5b8201836020820111156104cc57600080fd5b803590602001918460208302840111640100000000831117156104ee57600080fd5b90919293919293908035906020019064010000000081111561050f57600080fd5b82018360208201111561052157600080fd5b8035906020019184602083028401116401000000008311171561054357600080fd5b90919293919293908035906020019064010000000081111561056457600080fd5b82018360208201111561057657600080fd5b8035906020019184600183028401116401000000008311171561059857600080fd5b9091929391929390505050610b62565b60405180827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916815260200191505060405180910390f35b3480156105e957600080fd5b506106b5600480360360a081101561060057600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190803590602001909291908035906020019064010000000081111561067157600080fd5b82018360208201111561068357600080fd5b803590602001918460018302840111640100000000831117156106a557600080fd5b9091929391929390505050610b7a565b60405180827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916815260200191505060405180910390f35b60006107387fbe27a319efc8734e89e26ba4bc95f5c788584163b959f03fa04e2d7ab4b9a12060001b837bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916610b90565b60001c9050919050565b60007fec6aba50000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916148061080d57507f4e2312e0000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b8061087557507f150b7a02000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b806108dd57507fc0ee0b8a000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b156108eb57600190506108f7565b6108f482610bcf565b90505b919050565b600063150b7a0260e01b905095945050505050565b600061091c826106ea565b9050919050565b3073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146109a7576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526027815260200180610d1e6027913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff166109c8826106ea565b73ffffffffffffffffffffffffffffffffffffffff161415610a35576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602b815260200180610cc7602b913960400191505060405180910390fd5b610a40816000610c20565b50565b3073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610ac7576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526027815260200180610d1e6027913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff16610ae8836106ea565b73ffffffffffffffffffffffffffffffffffffffff1614610b54576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180610cf2602c913960400191505060405180910390fd5b610b5e8282610c20565b5050565b600063bc197c8160e01b905098975050505050505050565b600063f23a6e6160e01b90509695505050505050565b60008083836040516020018083815260200182815260200192505050604051602081830303815290604052805190602001209050805491505092915050565b60006301ffc9a760e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b610c867fbe27a319efc8734e89e26ba4bc95f5c788584163b959f03fa04e2d7ab4b9a12060001b837bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19168373ffffffffffffffffffffffffffffffffffffffff1660001b610c8a565b5050565b6000838360405160200180838152602001828152602001925050506040516020818303038152906040528051906020012090508181555050505056fe4d6f64756c65486f6f6b732372656d6f7665486f6f6b3a20484f4f4b5f4e4f545f524547495354455245444d6f64756c65486f6f6b7323616464486f6f6b3a20484f4f4b5f414c52454144595f524547495354455245444d6f64756c6553656c6641757468236f6e6c7953656c663a204e4f545f415554484f52495a4544a2646970667358221220505c312ce7e627d944f46fad0264b280ea32e0723f850ac96288cb5a26c6fa8c64736f6c63430007060033";
    static readonly abi: ({
        stateMutability: string;
        type: string;
        inputs?: undefined;
        name?: undefined;
        outputs?: undefined;
    } | {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    })[];
    static createInterface(): ModuleHooksInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): ModuleHooks;
}
export {};
