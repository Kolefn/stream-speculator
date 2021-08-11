import { UIProvider } from '../src/index';
const withUIProvider = (StoryFn) => {
    return (<UIProvider>
        <StoryFn />
    </UIProvider>);
};
export const parameters = {
    layout: 'fullscreen',
};
export const decorators = [withUIProvider]