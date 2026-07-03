import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Players } from './pages/Players';
import { Groups } from './pages/Groups';
import { Schedule } from './pages/Schedule';
import { Bracket } from './pages/Bracket';
import { Settings } from './pages/Settings';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jugadores" element={<Players />} />
        <Route path="/grupos" element={<Groups />} />
        <Route path="/calendario" element={<Schedule />} />
        <Route path="/cuadro" element={<Bracket />} />
        <Route path="/configuracion" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
