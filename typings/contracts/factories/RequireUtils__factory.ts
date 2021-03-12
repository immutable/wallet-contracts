/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import type { RequireUtils } from "../RequireUtils";

export class RequireUtils__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _factory: string,
    _mainModule: string,
    overrides?: Overrides
  ): Promise<RequireUtils> {
    return super.deploy(
      _factory,
      _mainModule,
      overrides || {}
    ) as Promise<RequireUtils>;
  }
  getDeployTransaction(
    _factory: string,
    _mainModule: string,
    overrides?: Overrides
  ): TransactionRequest {
    return super.getDeployTransaction(_factory, _mainModule, overrides || {});
  }
  attach(address: string): RequireUtils {
    return super.attach(address) as RequireUtils;
  }
  connect(signer: Signer): RequireUtils__factory {
    return super.connect(signer) as RequireUtils__factory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): RequireUtils {
    return new Contract(address, _abi, signerOrProvider) as RequireUtils;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_factory",
        type: "address",
      },
      {
        internalType: "address",
        name: "_mainModule",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_wallet",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "_imageHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_threshold",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "_signers",
        type: "bytes",
      },
    ],
    name: "RequiredConfig",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_wallet",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "_signer",
        type: "address",
      },
    ],
    name: "RequiredSigner",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastSignerUpdate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastWalletUpdate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_wallet",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_threshold",
        type: "uint256",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "weight",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "signer",
            type: "address",
          },
        ],
        internalType: "struct RequireUtils.Member[]",
        name: "_members",
        type: "tuple[]",
      },
      {
        internalType: "bool",
        name: "_index",
        type: "bool",
      },
    ],
    name: "publishConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_wallet",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "_hash",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "_sizeMembers",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_signature",
        type: "bytes",
      },
      {
        internalType: "bool",
        name: "_index",
        type: "bool",
      },
    ],
    name: "publishInitialSigners",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_wallet",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_nonce",
        type: "uint256",
      },
    ],
    name: "requireMinNonce",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_expiration",
        type: "uint256",
      },
    ],
    name: "requireNonExpired",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x60c06040523480156200001157600080fd5b50604051620020c8380380620020c88339810160408190526200003491620000bb565b606082811b6001600160601b03191660a0526040805191820190526028808252620020a06020830139816001600160a01b03166040516020016200007a929190620000f2565b60408051601f19818403018152919052805160209091012060805250620001349050565b80516001600160a01b0381168114620000b657600080fd5b919050565b60008060408385031215620000ce578182fd5b620000d9836200009e565b9150620000e9602084016200009e565b90509250929050565b60008351815b81811015620001145760208187018101518583015201620000f8565b81811115620001235782828501525b509190910191825250602001919050565b60805160a05160601c611f3b6200016560003980610314528061077c52508061033852806107a05250611f3b6000f3fe608060405234801561001057600080fd5b50600436106100725760003560e01c80637f29d538116100505780637f29d538146100c8578063b472f0a2146100db578063e717aba9146100ee57610072565b80631cd05dc41461007757806344d466c2146100a05780637082503b146100b5575b600080fd5b61008a6100853660046114cb565b610101565b6040516100979190611c42565b60405180910390f35b6100b36100ae3660046115ff565b610113565b005b6100b36100c33660046114ec565b61048d565b6100b36100d63660046116a7565b6108f6565b6100b36100e93660046115d6565b610932565b61008a6100fc3660046114cb565b610a10565b60006020819052908152604090205481565b8360005b838110156101ac578185858381811061012c57fe5b9050604002016000013586868481811061014257fe5b905060400201602001602081019061015a91906114cb565b60405160200161016c939291906118e2565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe081840301815291905280516020909101209150600101610117565b506000808773ffffffffffffffffffffffffffffffffffffffff166351605d8060e01b6040516020016101df919061176d565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0818403018152908290526102179161179a565b6000604051808303816000865af19150503d8060008114610254576040519150601f19603f3d011682016040523d82523d6000602084013e610259565b606091505b509150915081801561026c575080516020145b156102d157600081806020019051810190610287919061168f565b90508381146102cb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c290611b62565b60405180910390fd5b506103c6565b60405173ffffffffffffffffffffffffffffffffffffffff891690610360907fff00000000000000000000000000000000000000000000000000000000000000907f00000000000000000000000000000000000000000000000000000000000000009087907f000000000000000000000000000000000000000000000000000000000000000090602001611709565b6040516020818303038152906040528051906020012060001c73ffffffffffffffffffffffffffffffffffffffff16146103c6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c290611bbf565b828873ffffffffffffffffffffffffffffffffffffffff167fb502b7446ca079086188acf3abef47c2f464f2ee9a72fcdf05ffcb74dcc17cee898989604051602001610413929190611819565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529082905261044c9291611c4b565b60405180910390a383156104835773ffffffffffffffffffffffffffffffffffffffff881660009081526001602052604090204390555b5050505050505050565b60008061049984610a22565b915091506000804690508089896040516020016104b8939291906117b6565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0818403018152919052805160209091012091505061ffff831660008767ffffffffffffffff8111801561050f57600080fd5b5060405190808252806020026020018201604052801561054957816020015b61053661147b565b81526020019060019003908161052e5790505b50905060005b875185101561070057600080806105668b89610a90565b995060ff9182169450169150600183141561058e576105858b89610b11565b98509050610681565b826105c057606061059f8c8a610b89565b995090506105ad8882610c3a565b91506105ba8f838d610fc4565b50610681565b600283141561064f576105d38b89610b11565b9850905060006105e38c8a611052565b995061ffff16905060606105f88d8b846110c3565b9a5090506106078984836111b2565b61063d576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c290611aa8565b505061064a8e828c610fc4565b610681565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c29061190e565b60405180604001604052808381526020018273ffffffffffffffffffffffffffffffffffffffff168152508585815181106106b857fe5b602002602001018190525083806001019450508582826040516020016106e0939291906118e2565b60405160208183030381529060405280519060200120955050505061054f565b888114610739576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c290611b05565b60405173ffffffffffffffffffffffffffffffffffffffff8c16906107c8907fff00000000000000000000000000000000000000000000000000000000000000907f00000000000000000000000000000000000000000000000000000000000000009087907f000000000000000000000000000000000000000000000000000000000000000090602001611709565b6040516020818303038152906040528051906020012060001c73ffffffffffffffffffffffffffffffffffffffff161461082e576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c290611a25565b828b73ffffffffffffffffffffffffffffffffffffffff167fb502b7446ca079086188acf3abef47c2f464f2ee9a72fcdf05ffcb74dcc17cee8885604051602001610879919061187d565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0818403018152908290526108b29291611c1d565b60405180910390a386156108e95773ffffffffffffffffffffffffffffffffffffffff8b1660009081526001602052604090204390555b5050505050505050505050565b80421061092f576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c2906119c8565b50565b60008061093e836113fa565b9150915060008473ffffffffffffffffffffffffffffffffffffffff16638c3f5563846040518263ffffffff1660e01b815260040161097d9190611c42565b60206040518083038186803b15801561099557600080fd5b505afa1580156109a9573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109cd919061168f565b905081811015610a09576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c29061196b565b5050505050565b60016020526000908152604090205481565b6020810151815160f09190911c90600290811115610a8b576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526027815260200180611d2f6027913960400191505060405180910390fd5b915091565b8082016020015160f881901c9060f01c60ff1660028301838111610ab057fe5b8451811115610b0a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526026815260200180611e616026913960400191505060405180910390fd5b9250925092565b8082016020015160601c60148201828111610b2857fe5b8351811115610b82576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526023815260200180611d0c6023913960400191505060405180910390fd5b9250929050565b604080516042808252608082019092526060916000919060208201818036833701905050915082840160200180516020840152602081015160408401526022810151604284015250604283019050828111610be057fe5b8351811115610b82576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526023815260200180611e026023913960400191505060405180910390fd5b60008151604214610c96576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a815260200180611cd2603a913960400191505060405180910390fd5b600082600184510381518110610ca857fe5b602001015160f81c60f81b60f81c60ff169050600083604081518110610cca57fe5b016020015160f81c90506000610ce08582611413565b90506000610cef866020611413565b90507f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0811115610d6a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603d815260200180611c95603d913960400191505060405180910390fd5b8260ff16601b14158015610d8257508260ff16601c14155b15610dd8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603d815260200180611d56603d913960400191505060405180910390fd5b6001841415610e4c5760018784848460405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015610e3b573d6000803e3d6000fd5b505050602060405103519450610f4e565b6002841415610efd5760018760405160200180807f19457468657265756d205369676e6564204d6573736167653a0a333200000000815250601c018281526020019150506040516020818303038152906040528051906020012084848460405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015610e3b573d6000803e3d6000fd5b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603c815260200180611e25603c913960400191505060405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff8516610fba576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526030815260200180611d936030913960400191505060405180910390fd5b5050505092915050565b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f600ba597427f042bcd559a0d06fa1732cc104d6dd43cbe8845b5a0e804b2b39f60405160405180910390a3801561104d5773ffffffffffffffffffffffffffffffffffffffff821660009081526020819052604090204390555b505050565b8082016020015160f01c6002820182811161106957fe5b8351811115610b82576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180611ea86022913960400191505060405180910390fd5b606060008267ffffffffffffffff811180156110de57600080fd5b506040519080825280601f01601f191660200182016040528015611109576020820181803683370190505b509150838501602001600060205b8581101561113057908201518482015260208101611117565b848601602001805193909201519085015252508282018381101561115057fe5b84518111156111aa576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526021815260200180611e876021913960400191505060405180910390fd5b935093915050565b600080826001845103815181106111c557fe5b016020015160f81c905060018114806111de5750600281145b15611222578373ffffffffffffffffffffffffffffffffffffffff166112048685610c3a565b73ffffffffffffffffffffffffffffffffffffffff161491506113f2565b60038114156113a15782517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81018452604080517f1626ba7e000000000000000000000000000000000000000000000000000000008152600481018881526024820192835286516044830152865173ffffffffffffffffffffffffffffffffffffffff891693631626ba7e938b938a9390929160640190602085019080838360005b838110156112dc5781810151838201526020016112c4565b50505050905090810190601f1680156113095780820380516001836020036101000a031916815260200191505b50935050505060206040518083038186803b15801561132757600080fd5b505afa15801561133b573d6000803e3d6000fd5b505050506040513d602081101561135157600080fd5b50519084527fffffffff00000000000000000000000000000000000000000000000000000000167f1626ba7e000000000000000000000000000000000000000000000000000000001491506113f2565b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603f815260200180611dc3603f913960400191505060405180910390fd5b509392505050565b606081901c916bffffffffffffffffffffffff90911690565b60008160200183511015611472576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603c815260200180611eca603c913960400191505060405180910390fd5b50016020015190565b604080518082019091526000808252602082015290565b803573ffffffffffffffffffffffffffffffffffffffff811681146114b657600080fd5b919050565b803580151581146114b657600080fd5b6000602082840312156114dc578081fd5b6114e582611492565b9392505050565b600080600080600060a08688031215611503578081fd5b61150c86611492565b9450602080870135945060408701359350606087013567ffffffffffffffff80821115611537578384fd5b818901915089601f83011261154a578384fd5b81358181111561155657fe5b604051847fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f840116820101818110848211171561159157fe5b60405281815283820185018c10156115a7578586fd5b81858501868301378585838301015280965050505050506115ca608087016114bb565b90509295509295909350565b600080604083850312156115e8578182fd5b6115f183611492565b946020939093013593505050565b600080600080600060808688031215611616578081fd5b61161f86611492565b945060208601359350604086013567ffffffffffffffff80821115611642578283fd5b818801915088601f830112611655578283fd5b813581811115611663578384fd5b896020604083028501011115611677578384fd5b6020830195508094505050506115ca606087016114bb565b6000602082840312156116a0578081fd5b5051919050565b6000602082840312156116b8578081fd5b5035919050565b600081518084526116d7816020860160208601611c64565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b7fff0000000000000000000000000000000000000000000000000000000000000094909416845260609290921b7fffffffffffffffffffffffffffffffffffffffff0000000000000000000000001660018401526015830152603582015260550190565b7fffffffff0000000000000000000000000000000000000000000000000000000091909116815260040190565b600082516117ac818460208701611c64565b9190910192915050565b7f19010000000000000000000000000000000000000000000000000000000000008152600281019390935260609190911b7fffffffffffffffffffffffffffffffffffffffff000000000000000000000000166022830152603682015260560190565b6020808252818101839052600090604080840186845b87811015611870578135835273ffffffffffffffffffffffffffffffffffffffff61185b868401611492565b1683860152918301919083019060010161182f565b5090979650505050505050565b602080825282518282018190526000919060409081850190868401855b828110156118d55781518051855286015173ffffffffffffffffffffffffffffffffffffffff1686850152928401929085019060010161189a565b5091979650505050505050565b928352602083019190915273ffffffffffffffffffffffffffffffffffffffff16604082015260600190565b6020808252603a908201527f526571756972655574696c73237075626c697368496e697469616c5369676e6560408201527f72733a20494e56414c49445f5349474e41545552455f464c4147000000000000606082015260800190565b60208082526032908201527f526571756972655574696c7323726571756972654d696e4e6f6e63653a204e4f60408201527f4e43455f42454c4f575f52455155495245440000000000000000000000000000606082015260800190565b60208082526027908201527f526571756972655574696c7323726571756972654e6f6e457870697265643a2060408201527f4558504952454400000000000000000000000000000000000000000000000000606082015260800190565b60208082526048908201527f526571756972655574696c73237075626c697368496e697469616c5369676e6560408201527f72733a20554e45585045435445445f434f554e5445524641435455414c5f494d60608201527f4147455f48415348000000000000000000000000000000000000000000000000608082015260a00190565b60208082526032908201527f4d6f64756c6541757468235f7369676e617475726556616c69646174696f6e3a60408201527f20494e56414c49445f5349474e41545552450000000000000000000000000000606082015260800190565b60208082526039908201527f526571756972655574696c73237075626c697368496e697469616c5369676e6560408201527f72733a20494e56414c49445f4d454d424552535f434f554e5400000000000000606082015260800190565b60208082526031908201527f526571756972655574696c73237075626c697368436f6e6669673a20554e455860408201527f5045435445445f494d4147455f48415348000000000000000000000000000000606082015260800190565b602080825260409082018190527f526571756972655574696c73237075626c697368436f6e6669673a20554e4558908201527f5045435445445f434f554e5445524641435455414c5f494d4147455f48415348606082015260800190565b600061ffff8416825260406020830152611c3a60408301846116bf565b949350505050565b90815260200190565b600083825260406020830152611c3a60408301846116bf565b60005b83811015611c7f578181015183820152602001611c67565b83811115611c8e576000848401525b5050505056fe5369676e617475726556616c696461746f72237265636f7665725369676e65723a20696e76616c6964207369676e6174757265202773272076616c75655369676e617475726556616c696461746f72237265636f7665725369676e65723a20696e76616c6964207369676e6174757265206c656e6774684c696242797465732372656164416464726573733a204f55545f4f465f424f554e44534c696242797465732372656164466972737455696e7431363a204f55545f4f465f424f554e44535369676e617475726556616c696461746f72237265636f7665725369676e65723a20696e76616c6964207369676e6174757265202776272076616c75655369676e617475726556616c696461746f72237265636f7665725369676e65723a20494e56414c49445f5349474e45525369676e617475726556616c696461746f7223697356616c69645369676e61747572653a20554e535550504f525445445f5349474e41545552455f545950454c696242797465732372656164427974657336363a204f55545f4f465f424f554e44535369676e617475726556616c696461746f72237265636f7665725369676e65723a20554e535550504f525445445f5349474e41545552455f545950454c69624279746573237265616455696e743855696e74383a204f55545f4f465f424f554e44534c69624279746573237265616442797465733a204f55545f4f465f424f554e44534c69624279746573237265616455696e7431363a204f55545f4f465f424f554e44534c696242797465732372656164427974657333323a20475245415445525f4f525f455155414c5f544f5f33325f4c454e4754485f5245515549524544a2646970667358221220f87b81f1521876902468ef093189b1633349a58352906c75afa16c49cddcd70c64736f6c63430007060033603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3";