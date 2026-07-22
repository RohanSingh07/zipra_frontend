import { useCallback, useRef, useState } from "react";
import { RefreshControl } from "react-native";

import { COLORS } from "../constants/theme";

export default function usePullToRefresh(
  reload: () => Promise<unknown> | unknown
) {
  const reloadRef = useRef(reload);
  const refreshingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  reloadRef.current = reload;

  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setRefreshing(true);

    try {
      await reloadRef.current();
    } catch (error) {
      console.log("PULL TO REFRESH ERROR", error);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[COLORS.primary]}
      tintColor={COLORS.primary}
      progressBackgroundColor={COLORS.white}
    />
  );
}
