"use client";

import { ActionBar, Checkbox, Input, InputGroup, Portal, Stack, Box } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { TokenTable, type ColumnSort, type SortDirection } from "./TokenTable";
import { Pagination } from "./Pagination";
import { ActionBarContent } from "./ActionBarContent";
import { isFungibleToken, type TokenAsset } from "@/types";

const ITEMS_PER_PAGE = 50;

export const TokenTableContainer = ({ user }: { user: string }) => {
  const [selection, setSelection] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [allAssets, setAllAssets] = useState<TokenAsset[]>([]);
  const [showOnlyFungible, setShowOnlyFungible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<ColumnSort>({
    column: "name",
    direction: "asc",
  });
  const [minAmount, setMinAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [receiver, setReceiver] = useState("");

  const hasSelection = selection.length > 0;

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/assets?owner=${encodeURIComponent(user)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch assets");
        }

        const data: { items?: TokenAsset[] } = await response.json();
        setAllAssets(data.items ?? []);
        setSelection([]);
        setPage(1);
      } catch (error) {
        console.error("Error fetching assets:", error);
        setAllAssets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [user]);

  const filteredAssets = useMemo(() => {
    let assets = showOnlyFungible
      ? allAssets.filter(isFungibleToken)
      : allAssets;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      assets = assets.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.id.toLowerCase().includes(query)
      );
    }

    const min = Number(minAmount);
    if (minAmount.trim() !== "" && !Number.isNaN(min)) {
      assets = assets.filter((asset) => asset.amount > min);
    }

    if (!sort) return assets;

    return [...assets].sort((a, b) => {
      if (sort.column === "name") {
        const comparison = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
          numeric: true,
        });
        return sort.direction === "asc" ? comparison : -comparison;
      }

      const comparison = a.amount - b.amount;
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [allAssets, showOnlyFungible, searchQuery, minAmount, sort]);

  const handleTokenSortChange = (direction: SortDirection | null) => {
    setSort(direction ? { column: "name", direction } : null);
    setPage(1);
  };

  const handleAmountSortChange = (direction: SortDirection | null) => {
    setSort(direction ? { column: "amount", direction } : null);
    setPage(1);
  };

  const handleMinAmountChange = (value: string) => {
    setMinAmount(value);
    setPage(1);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssets.length / ITEMS_PER_PAGE)
  );
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentPageAssets = filteredAssets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleAmountChange = (id: string, value: number) => {
    setAllAssets((prev) =>
      prev.map((asset) =>
        asset.id === id ? { ...asset, amountToSend: value } : asset
      )
    );
    if (!selection.includes(id)) {
      setSelection((prev) => [...prev, id]);
    }
  };

  return (
    <Stack width="full" gap="5">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={4}
        flexWrap="wrap"
        mb={4}
      >
        <Checkbox.Root
          checked={showOnlyFungible}
          onCheckedChange={(changes) => {
            setShowOnlyFungible(changes.checked === true);
            setPage(1);
          }}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label color="gray.700">Show tokens only</Checkbox.Label>
        </Checkbox.Root>
        <InputGroup
          startElement={<LuSearch />}
          width="280px"
          maxW="full"
          ml="auto"
        >
          <Input
            placeholder="Search tokens"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            size="sm"
            bg="white"
            aria-label="Search tokens"
          />
        </InputGroup>
      </Box>

      <TokenTable
        assets={currentPageAssets}
        selection={selection}
        onSelectionChange={setSelection}
        onAmountChange={handleAmountChange}
        isLoading={isLoading}
        emptyMessage={
          searchQuery.trim() || minAmount.trim()
            ? "No matching tokens"
            : "No tokens found"
        }
        sort={sort}
        minAmount={minAmount}
        onTokenSortChange={handleTokenSortChange}
        onAmountSortChange={handleAmountSortChange}
        onMinAmountChange={handleMinAmountChange}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPrevPage={() => page > 1 && setPage(page - 1)}
        onNextPage={() => page < totalPages && setPage(page + 1)}
      />

      <ActionBar.Root open={hasSelection}>
        <Portal>
          <ActionBar.Positioner>
            <ActionBarContent
              receiver={receiver}
              onReceiverChange={setReceiver}
              onReceiverPaste={setReceiver}
              selectedAssets={allAssets.filter((asset) =>
                selection.includes(asset.id)
              )}
            />
          </ActionBar.Positioner>
        </Portal>
      </ActionBar.Root>
    </Stack>
  );
};
