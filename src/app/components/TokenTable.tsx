"use client";

import {
  Box,
  Checkbox,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Menu,
  Popover,
  Portal,
  RadioGroup,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  LuArrowDownAZ,
  LuArrowDownNarrowWide,
  LuArrowUpAZ,
  LuArrowUpNarrowWide,
  LuListFilter,
  LuX,
} from "react-icons/lu";
import { TokenRow } from "./TokenRow";
import { type TokenAsset } from "@/types";

export type SortDirection = "asc" | "desc";
export type ColumnSort = {
  column: "name" | "amount";
  direction: SortDirection;
} | null;

interface TokenTableProps {
  assets: TokenAsset[];
  selection: string[];
  onSelectionChange: (ids: string[]) => void;
  onAmountChange: (id: string, value: number) => void;
  isLoading: boolean;
  emptyMessage?: string;
  sort: ColumnSort;
  minAmount: string;
  onTokenSortChange: (direction: SortDirection | null) => void;
  onAmountSortChange: (direction: SortDirection | null) => void;
  onMinAmountChange: (value: string) => void;
}

const TokenSortMenu = ({
  sort,
  onTokenSortChange,
}: {
  sort: ColumnSort;
  onTokenSortChange: (direction: SortDirection | null) => void;
}) => {
  const isActive = sort?.column === "name";

  return (
    <HStack gap="1">
      <Text as="span">Token</Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            size="xs"
            variant="ghost"
            aria-label="Sort tokens alphabetically"
            color={isActive ? "blue.600" : "gray.500"}
          >
            {isActive && sort.direction === "desc" ? (
              <LuArrowDownAZ />
            ) : (
              <LuArrowUpAZ />
            )}
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="10rem">
              <Menu.RadioItemGroup
                value={isActive ? sort.direction : ""}
                onValueChange={(details) =>
                  onTokenSortChange(details.value as SortDirection)
                }
              >
                <Menu.RadioItem value="asc">
                  <Menu.ItemText>A → Z</Menu.ItemText>
                  <Menu.ItemIndicator />
                </Menu.RadioItem>
                <Menu.RadioItem value="desc">
                  <Menu.ItemText>Z → A</Menu.ItemText>
                  <Menu.ItemIndicator />
                </Menu.RadioItem>
              </Menu.RadioItemGroup>
              <Menu.Separator />
              <Menu.Item
                value="clear-token-sort"
                disabled={!isActive}
                onClick={() => onTokenSortChange(null)}
              >
                Clear
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </HStack>
  );
};

const AmountFilterMenu = ({
  sort,
  minAmount,
  onAmountSortChange,
  onMinAmountChange,
}: {
  sort: ColumnSort;
  minAmount: string;
  onAmountSortChange: (direction: SortDirection | null) => void;
  onMinAmountChange: (value: string) => void;
}) => {
  const isSorted = sort?.column === "amount";
  const isFiltered = minAmount.trim() !== "";
  const isActive = isSorted || isFiltered;

  return (
    <HStack gap="1">
      <Text as="span">Amount</Text>
      <Popover.Root positioning={{ placement: "bottom-start" }}>
        <Popover.Trigger asChild>
          <IconButton
            size="xs"
            variant="ghost"
            aria-label="Filter and sort amounts"
            color={isActive ? "blue.600" : "gray.500"}
          >
            {isSorted ? (
              sort.direction === "desc" ? (
                <LuArrowDownNarrowWide />
              ) : (
                <LuArrowUpNarrowWide />
              )
            ) : (
              <LuListFilter />
            )}
          </IconButton>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content width="220px">
              <Popover.Arrow />
              <Popover.Body>
                <Stack gap="3">
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Sort
                  </Text>
                  <RadioGroup.Root
                    size="sm"
                    value={isSorted ? sort.direction : ""}
                    onValueChange={(details) => {
                      if (
                        details.value === "asc" ||
                        details.value === "desc"
                      ) {
                        onAmountSortChange(details.value);
                      }
                    }}
                  >
                    <Stack gap="2">
                      <RadioGroup.Item value="asc" cursor="pointer">
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        <RadioGroup.ItemText>Low to high</RadioGroup.ItemText>
                      </RadioGroup.Item>
                      <RadioGroup.Item value="desc" cursor="pointer">
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        <RadioGroup.ItemText>High to low</RadioGroup.ItemText>
                      </RadioGroup.Item>
                    </Stack>
                  </RadioGroup.Root>
                  <Text
                    fontSize="sm"
                    color="blue.600"
                    cursor={isSorted ? "pointer" : "default"}
                    opacity={isSorted ? 1 : 0.5}
                    onClick={() => isSorted && onAmountSortChange(null)}
                  >
                    Clear sort
                  </Text>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Greater than
                  </Text>
                  <InputGroup
                    endElement={
                      isFiltered ? (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          aria-label="Clear amount filter"
                          onClick={() => onMinAmountChange("")}
                        >
                          <LuX />
                        </IconButton>
                      ) : undefined
                    }
                  >
                    <Input
                      type="number"
                      size="sm"
                      placeholder="N"
                      min="0"
                      value={minAmount}
                      onChange={(event) =>
                        onMinAmountChange(event.target.value)
                      }
                      inputMode="decimal"
                    />
                  </InputGroup>
                </Stack>
              </Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    </HStack>
  );
};

export const TokenTable = ({
  assets = [],
  selection = [],
  onSelectionChange,
  onAmountChange,
  isLoading,
  emptyMessage = "No tokens found",
  sort,
  minAmount,
  onTokenSortChange,
  onAmountSortChange,
  onMinAmountChange,
}: TokenTableProps) => (
  <Box overflowX="auto" width="full">
    <Table.Root variant="outline" bg="white" minW="800px">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader w="6">
            <Checkbox.Root
              size="sm"
              top="0.5"
              aria-label="Select all rows"
              checked={selection.length > 0}
              onCheckedChange={(changes) =>
                onSelectionChange(
                  changes.checked ? assets.map((asset) => asset.id) : []
                )
              }
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
            </Checkbox.Root>
          </Table.ColumnHeader>
          <Table.ColumnHeader color="gray.700" minW="200px">
            <TokenSortMenu sort={sort} onTokenSortChange={onTokenSortChange} />
          </Table.ColumnHeader>
          <Table.ColumnHeader color="gray.700" minW="150px">
            <AmountFilterMenu
              sort={sort}
              minAmount={minAmount}
              onAmountSortChange={onAmountSortChange}
              onMinAmountChange={onMinAmountChange}
            />
          </Table.ColumnHeader>
          <Table.ColumnHeader color="gray.700" minW="150px">
            Amount to Send
          </Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {isLoading ? (
          <Table.Row>
            <Table.Cell colSpan={4} textAlign="center" color="gray.600">
              Loading...
            </Table.Cell>
          </Table.Row>
        ) : assets.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={4} textAlign="center" color="gray.600">
              {emptyMessage}
            </Table.Cell>
          </Table.Row>
        ) : (
          assets.map((item) => (
            <TokenRow
              key={item.id}
              item={item}
              isSelected={selection.includes(item.id)}
              onSelectionChange={(checked) => {
                const newSelection = checked
                  ? [...selection, item.id]
                  : selection.filter((id) => id !== item.id);
                onSelectionChange(newSelection);
              }}
              onAmountChange={(value) => {
                const cleanValue = value.replace(/^0+/, "") || "0";
                const numValue = parseFloat(cleanValue);
                if (!isNaN(numValue)) {
                  onAmountChange(item.id, numValue);
                }
              }}
            />
          ))
        )}
      </Table.Body>
    </Table.Root>
  </Box>
);
