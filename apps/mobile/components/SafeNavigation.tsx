import React from 'react';
import {
  NavigationContext as CoreNavigationContext,
  NavigationContainerRefContext as CoreContainerContext,
} from '@react-navigation/core';
import { NavigationContext as NativeNavigationContext } from '@react-navigation/native';

const dummyNavigation: any = {
  addListener: () => () => {},
  removeListener: () => {},
  dispatch: () => false,
  isFocused: () => true,
  canGoBack: () => false,
  getId: () => undefined,
  getParent: () => undefined,
  getState: () => ({ routes: [], index: 0, key: 'stack-0', routeNames: [], type: 'stack' }),
  navigate: () => {},
  replace: () => {},
  push: () => {},
  pop: () => {},
  popToTop: () => {},
  goBack: () => {},
  setOptions: () => {},
  setParams: () => {},
};

export function SafeNavigationProvider({ children }: { children: React.ReactNode }) {
  const coreNav = React.useContext(CoreNavigationContext);
  const coreRoot = React.useContext(CoreContainerContext);
  const nativeNav = React.useContext(NativeNavigationContext);

  const activeNav = coreNav || nativeNav || coreRoot || dummyNavigation;

  return (
    <CoreContainerContext.Provider value={coreRoot || dummyNavigation}>
      <NativeNavigationContext.Provider value={activeNav}>
        <CoreNavigationContext.Provider value={activeNav}>
          {children}
        </CoreNavigationContext.Provider>
      </NativeNavigationContext.Provider>
    </CoreContainerContext.Provider>
  );
}
