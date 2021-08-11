import { ChakraProvider } from '@chakra-ui/react';
import { ReactNode } from 'react';
import theme from '../Theme';
const UIProvider = (props: { children: ReactNode }) => {
  return <ChakraProvider theme={theme}>{props.children}</ChakraProvider>;
};
export default UIProvider;
