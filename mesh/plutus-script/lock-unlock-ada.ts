import { PlutusScript, Transaction, UTxO, resolveDataHash, resolvePaymentKeyHash, resolvePlutusScriptAddress } from "@meshsdk/core";
import { getWallet } from "../common/get-wallet";
import { getProvider } from "../common/get-provider";


const wallet = getWallet();

const wAddr = wallet.getChangeAddress();
console.log("wAddr: ", wAddr);

/*
type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

validator {
  fn consume_if_signed( vkh: VerificationKeyHash, _r: Void, ctx: ScriptContext,) -> Bool {
    let ScriptContext {
      purpose,
      transaction: Transaction { extra_signatories, .. },
    } = ctx
    when purpose is {
      Spend(_) -> list.has(extra_signatories, vkh)
      _ -> False
    }
  }
}
*/
const script: PlutusScript = {
  version: "V2",
  code: "5901a301000032323232323232323232232232253330083232533300a3370e900118061baa300f3010002153300b49013149732061205370656e642076616c696461746f722e20436865636b696e67206578747261207369676e61746f726965732e001533300a323300100100222533301000114a0264a66601a66e3cdd718090010048a51133003003001301200114a22a66016921286c6973742e6861732865787472615f7369676e61746f726965732c20766b6829203f2046616c73650014a02940dd618071807980798079807980798079807980798061baa300e001300b37540022930a99804a491856616c696461746f722072657475726e65642066616c73650013656533333300d001153330063370e900018041baa0011533300a300937540022930a998038020b0a998038020b0a998038020b0a998038020b0a998038020b0a998038020b29999998058008a998028018b0a998028018b0a998028018b0a998028018b09bae001491085f723a20566f696400490118766b683a20566572696669636174696f6e4b657948617368005734ae7155ceaab9e5573eae855d12ba41"
}

const scriptAddr = resolvePlutusScriptAddress(script, 0);

async function lockAtScript() {
  if (!wallet) return;
  const vkh = resolvePaymentKeyHash(wAddr)
  console.log("balance: ", await wallet.getBalance());
  console.log("vkHash: ", vkh);
  const tx = new Transaction({ initiator: wallet })
    .sendLovelace({
      address: scriptAddr, datum: { value: vkh, inline: true }
    }, '15000000'
    )
  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`txHash:\n ${txHash}`);
}

async function unlockFromScript() {
  if (!wallet) return;
  const vkh = resolvePaymentKeyHash(wAddr)

  const blockchainProvider = getProvider();

  const utxos = await blockchainProvider.fetchAddressUTxOs(scriptAddr);

  const ourUTxO: UTxO = utxos.find((utxo: UTxO) => utxo.output.dataHash == resolveDataHash(vkh));
  console.log("ourUTxO: ", ourUTxO);

  const tx = new Transaction({ initiator: wallet })
    .redeemValue({ value: ourUTxO, script: script })
    .sendValue(wAddr, ourUTxO)
    .setRequiredSigners([wAddr])

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`txHash:\n ${txHash}`);
}

//await lockAtScript();
await unlockFromScript();
