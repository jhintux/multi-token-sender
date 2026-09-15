import { Checkbox, Input, Table, Text } from "@chakra-ui/react";
import { type TokenAsset } from "@/types";
interface TokenRowProps {
  item: TokenAsset;
  isSelected: boolean;
  onSelectionChange: (checked: boolean | string) => void;
  onAmountChange: (value: string) => void;
}

export const TokenRow = ({ item, isSelected, onSelectionChange, onAmountChange }: TokenRowProps) => (
  <Table.Row data-selected={isSelected ? "" : undefined}>
    <Table.Cell>
      <Checkbox.Root
        size="sm"
        top="0.5"
        aria-label="Select row"
        checked={isSelected}
        onCheckedChange={(changes) => onSelectionChange(changes.checked)}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
      </Checkbox.Root>
    </Table.Cell>
    <Table.Cell>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {item.image && (
          <img
            src={item.image}
            alt={item.name}
            style={{ width: "24px", height: "24px", objectFit: "cover" }}
          />
        )}
        {item.name}
        {item.isToken2022 && (
          <Text
            as="span"
            fontSize="2xs"
            color="gray.500"
            borderWidth="1px"
            borderColor="gray.300"
            rounded="sm"
            px="1"
          >
            Token-2022
          </Text>
        )}
      </div>
    </Table.Cell>
    <Table.Cell>{item.amount}</Table.Cell>
    <Table.Cell>
      {isSelected ? (
        <Input
          type="number"
          value={item.amountToSend}
          onChange={(e) => onAmountChange(e.target.value)}
          inputMode="decimal"
          width="100px"
          size="sm"
          css={{
            "&::-webkit-inner-spin-button": { display: "none" },
            "&::-webkit-outer-spin-button": { display: "none" },
          }}
        />
      ) : (
        <Input
          type="number"
          value=""
          disabled
          width="100px"
          size="sm"
          css={{
            "&::-webkit-inner-spin-button": { display: "none" },
            "&::-webkit-outer-spin-button": { display: "none" },
          }}
        />
      )}
    </Table.Cell>
  </Table.Row>
); 