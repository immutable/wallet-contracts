import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type { Factory, FactoryInterface } from "../Factory";
type FactoryConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class Factory__factory extends ContractFactory {
    constructor(...args: FactoryConstructorParams);
    deploy(admin: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<Factory>;
    getDeployTransaction(admin: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): Factory;
    connect(signer: Signer): Factory__factory;
    static readonly bytecode = "0x60806040523480156200001157600080fd5b50604051620016bc380380620016bc833981810160405281019062000037919062000220565b6200004c6000801b826200005360201b60201c565b5062000252565b6200006582826200014460201b60201c565b6200014057600160008084815260200190815260200160002060000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff021916908315150217905550620000e5620001ae60201b60201c565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16837f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a45b5050565b600080600084815260200190815260200160002060000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16905092915050565b600033905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620001e882620001bb565b9050919050565b620001fa81620001db565b81146200020657600080fd5b50565b6000815190506200021a81620001ef565b92915050565b600060208284031215620002395762000238620001b6565b5b6000620002498482850162000209565b91505092915050565b61145a80620002626000396000f3fe6080604052600436106100915760003560e01c80637ac4ed64116100595780637ac4ed641461019257806391d14854146101cf578063a217fddf1461020c578063d547741f14610237578063ecd002611461026057610091565b806301ffc9a714610096578063248a9ca3146100d35780632f2ff15d1461011057806332c02a141461013957806336568abe14610169575b600080fd5b3480156100a257600080fd5b506100bd60048036038101906100b89190610c10565b61028b565b6040516100ca9190610c58565b60405180910390f35b3480156100df57600080fd5b506100fa60048036038101906100f59190610ca9565b610305565b6040516101079190610ce5565b60405180910390f35b34801561011c57600080fd5b5061013760048036038101906101329190610d5e565b610324565b005b610153600480360381019061014e9190610d9e565b610345565b6040516101609190610ded565b60405180910390f35b34801561017557600080fd5b50610190600480360381019061018b9190610d5e565b6104ac565b005b34801561019e57600080fd5b506101b960048036038101906101b49190610d9e565b61052f565b6040516101c69190610ded565b60405180910390f35b3480156101db57600080fd5b506101f660048036038101906101f19190610d5e565b6105c8565b6040516102039190610c58565b60405180910390f35b34801561021857600080fd5b50610221610632565b60405161022e9190610ce5565b60405180910390f35b34801561024357600080fd5b5061025e60048036038101906102599190610d5e565b610639565b005b34801561026c57600080fd5b5061027561065a565b6040516102829190610ce5565b60405180910390f35b60007f7965db0b000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614806102fe57506102fd8261067e565b5b9050919050565b6000806000838152602001908152602001600020600101549050919050565b61032d82610305565b610336816106e8565b61034083836106fc565b505050565b60007ffc425f2263d0df187444b70e47283d622c70181c5baebb1306a01edba1ce184c610371816106e8565b60006040518060600160405280602881526020016113fd602891398573ffffffffffffffffffffffffffffffffffffffff166040516020016103b4929190610ea4565b60405160208183030381529060405290508381516020830134f59250600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160361043f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161043690610f29565b60405180910390fd5b8473ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f195bcaf5c86c75410014291983a0bc0b60a4ae2874ff863699229144c361a2168660405161049c9190610ce5565b60405180910390a3505092915050565b6104b46107dc565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614610521576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161051890610fbb565b60405180910390fd5b61052b82826107e4565b5050565b60008060ff60f81b30846040518060600160405280602881526020016113fd602891398773ffffffffffffffffffffffffffffffffffffffff1660405160200161057a929190610ea4565b604051602081830303815290604052805190602001206040516020016105a39493929190611091565b6040516020818303038152906040528051906020012090508060001c91505092915050565b600080600084815260200190815260200160002060000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16905092915050565b6000801b81565b61064282610305565b61064b816106e8565b61065583836107e4565b505050565b7ffc425f2263d0df187444b70e47283d622c70181c5baebb1306a01edba1ce184c81565b60007f01ffc9a7000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b6106f9816106f46107dc565b6108c5565b50565b61070682826105c8565b6107d857600160008084815260200190815260200160002060000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff02191690831515021790555061077d6107dc565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16837f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a45b5050565b600033905090565b6107ee82826105c8565b156108c157600080600084815260200190815260200160002060000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055506108666107dc565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16837ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a45b5050565b6108cf82826105c8565b610946576108dc8161094a565b6108ea8360001c6020610977565b6040516020016108fb9291906111be565b6040516020818303038152906040526040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161093d9190611242565b60405180910390fd5b5050565b60606109708273ffffffffffffffffffffffffffffffffffffffff16601460ff16610977565b9050919050565b60606000600283600261098a9190611293565b61099491906112d5565b67ffffffffffffffff8111156109ad576109ac611309565b5b6040519080825280601f01601f1916602001820160405280156109df5781602001600182028036833780820191505090505b5090507f300000000000000000000000000000000000000000000000000000000000000081600081518110610a1757610a16611338565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a9053507f780000000000000000000000000000000000000000000000000000000000000081600181518110610a7b57610a7a611338565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a90535060006001846002610abb9190611293565b610ac591906112d5565b90505b6001811115610b65577f3031323334353637383961626364656600000000000000000000000000000000600f861660108110610b0757610b06611338565b5b1a60f81b828281518110610b1e57610b1d611338565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a905350600485901c945080610b5e90611367565b9050610ac8565b5060008414610ba9576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ba0906113dc565b60405180910390fd5b8091505092915050565b600080fd5b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b610bed81610bb8565b8114610bf857600080fd5b50565b600081359050610c0a81610be4565b92915050565b600060208284031215610c2657610c25610bb3565b5b6000610c3484828501610bfb565b91505092915050565b60008115159050919050565b610c5281610c3d565b82525050565b6000602082019050610c6d6000830184610c49565b92915050565b6000819050919050565b610c8681610c73565b8114610c9157600080fd5b50565b600081359050610ca381610c7d565b92915050565b600060208284031215610cbf57610cbe610bb3565b5b6000610ccd84828501610c94565b91505092915050565b610cdf81610c73565b82525050565b6000602082019050610cfa6000830184610cd6565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610d2b82610d00565b9050919050565b610d3b81610d20565b8114610d4657600080fd5b50565b600081359050610d5881610d32565b92915050565b60008060408385031215610d7557610d74610bb3565b5b6000610d8385828601610c94565b9250506020610d9485828601610d49565b9150509250929050565b60008060408385031215610db557610db4610bb3565b5b6000610dc385828601610d49565b9250506020610dd485828601610c94565b9150509250929050565b610de781610d20565b82525050565b6000602082019050610e026000830184610dde565b92915050565b600081519050919050565b600081905092915050565b60005b83811015610e3c578082015181840152602081019050610e21565b60008484015250505050565b6000610e5382610e08565b610e5d8185610e13565b9350610e6d818560208601610e1e565b80840191505092915050565b6000819050919050565b6000819050919050565b610e9e610e9982610e79565b610e83565b82525050565b6000610eb08285610e48565b9150610ebc8284610e8d565b6020820191508190509392505050565b600082825260208201905092915050565b7f57616c6c6574466163746f72793a206465706c6f796d656e74206661696c6564600082015250565b6000610f13602083610ecc565b9150610f1e82610edd565b602082019050919050565b60006020820190508181036000830152610f4281610f06565b9050919050565b7f416363657373436f6e74726f6c3a2063616e206f6e6c792072656e6f756e636560008201527f20726f6c657320666f722073656c660000000000000000000000000000000000602082015250565b6000610fa5602f83610ecc565b9150610fb082610f49565b604082019050919050565b60006020820190508181036000830152610fd481610f98565b9050919050565b60007fff0000000000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b61102261101d82610fdb565b611007565b82525050565b60008160601b9050919050565b600061104082611028565b9050919050565b600061105282611035565b9050919050565b61106a61106582610d20565b611047565b82525050565b6000819050919050565b61108b61108682610c73565b611070565b82525050565b600061109d8287611011565b6001820191506110ad8286611059565b6014820191506110bd828561107a565b6020820191506110cd828461107a565b60208201915081905095945050505050565b600081905092915050565b7f416363657373436f6e74726f6c3a206163636f756e7420000000000000000000600082015250565b60006111206017836110df565b915061112b826110ea565b601782019050919050565b600081519050919050565b600061114c82611136565b61115681856110df565b9350611166818560208601610e1e565b80840191505092915050565b7f206973206d697373696e6720726f6c6520000000000000000000000000000000600082015250565b60006111a86011836110df565b91506111b382611172565b601182019050919050565b60006111c982611113565b91506111d58285611141565b91506111e08261119b565b91506111ec8284611141565b91508190509392505050565b6000601f19601f8301169050919050565b600061121482611136565b61121e8185610ecc565b935061122e818560208601610e1e565b611237816111f8565b840191505092915050565b6000602082019050818103600083015261125c8184611209565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061129e82610e79565b91506112a983610e79565b92508282026112b781610e79565b915082820484148315176112ce576112cd611264565b5b5092915050565b60006112e082610e79565b91506112eb83610e79565b925082820190508082111561130357611302611264565b5b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600061137282610e79565b91506000820361138557611384611264565b5b600182039050919050565b7f537472696e67733a20686578206c656e67746820696e73756666696369656e74600082015250565b60006113c6602083610ecc565b91506113d182611390565b602082019050919050565b600060208201905081810360008301526113f5816113b9565b905091905056fe603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3a2646970667358221220f17616946698269975849caa22c49d18fd193c70629ae5181718e8d6be32049864736f6c63430008110033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "admin";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "constructor";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "previousAdminRole";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "newAdminRole";
            readonly type: "bytes32";
        }];
        readonly name: "RoleAdminChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }];
        readonly name: "RoleGranted";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }];
        readonly name: "RoleRevoked";
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
        readonly inputs: readonly [];
        readonly name: "DEFAULT_ADMIN_ROLE";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "DEPLOYER_ROLE";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
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
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }];
        readonly name: "getRoleAdmin";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "grantRole";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "hasRole";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "renounceRole";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "revokeRole";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "interfaceId";
            readonly type: "bytes4";
        }];
        readonly name: "supportsInterface";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): FactoryInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): Factory;
}
export {};
