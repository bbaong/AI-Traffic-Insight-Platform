import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router/AppRouter';
import { ScrollToTop } from './router/ScrollToTop';

function App() {
  return (
    <BrowserRouter basename="/AI-Traffic-Insight-Platform">
      <ScrollToTop />
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
