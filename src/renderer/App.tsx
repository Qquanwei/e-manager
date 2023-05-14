import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import { RecoilRoot } from 'recoil';
import Index from './pages/index';
import './App.css';

export default function App() {
  return (
    <RecoilRoot>
      <Suspense fallback={<div>global loading...</div>}>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
          </Routes>
        </Router>
      </Suspense>
    </RecoilRoot>
  );
}
