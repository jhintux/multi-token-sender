import { ActionBar, Button, CloseButton, Input, Link } from "@chakra-ui/react";
import { type TokenAsset } from "@/types";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toaster } from "@/components/ui/toaster";
import { LuExternalLink } from "react-icons/lu";
import { buildTransferInstructionGroups } from "@/utils/buildTransferInstructions";
import { sendPackedTransfers } from "@/utils/sendPackedTransfers";
import { useState } from "react";

interface ActionBarContentProps {
  receiver: string;
  onReceiverChange: (value: string) => void;
  onReceiverPaste: (value: string) => void;
  selectedAssets: TokenAsset[];
}

export const ActionBarContent = ({
  receiver,
  onReceiverChange,
  onReceiverPaste,
  selectedAssets,
}: ActionBarContentProps) => {
  const { publicKey, signTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const [isSending, setIsSending] = useState(false);

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  const sendAssets = async () => {
    if (!publicKey || isSending) return;

    setIsSending(true);
    try {
      const receiverPk = new PublicKey(receiver);
      const groups = await buildTransferInstructionGroups({
        connection,
        owner: publicKey,
        receiver: receiverPk,
        assets: selectedAssets,
      });

      if (groups.length === 0) {
        toaster.create({
          title: "Nothing to send",
          description: "Select tokens with an amount greater than 0.",
          type: "error",
        });
        return;
      }

      const signatures = await sendPackedTransfers({
        adapter: wallet?.adapter,
        connection,
        payer: publicKey,
        groups,
        signTransaction,
      });

      for (const signature of signatures) {
        toaster.create({
          title: "Transaction sent",
          description: (
            <Link href={`https://solscan.io/tx/${signature}`}>
              See transaction <LuExternalLink />
            </Link>
          ),
          type: "success",
        });
      }
    } catch (error: unknown) {
      toaster.create({
        title: "Error sending transaction",
        description: error instanceof Error ? error.message : String(error),
        type: "error",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ActionBar.Content>
      <Input
        placeholder="Wallet to send"
        value={receiver.length >= 19 ? formatAddress(receiver) : receiver}
        onChange={(e) => onReceiverChange(e.target.value)}
        onPaste={(e) => {
          e.preventDefault();
          onReceiverPaste(e.clipboardData.getData("text"));
        }}
      />
      <ActionBar.Separator />
      <Button
        variant="outline"
        size="sm"
        onClick={sendAssets}
        loading={isSending}
        disabled={isSending}
      >
        Send
      </Button>
      <ActionBar.CloseTrigger asChild>
        <CloseButton size="sm" />
      </ActionBar.CloseTrigger>
    </ActionBar.Content>
  );
};
