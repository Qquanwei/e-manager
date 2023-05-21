import {
  HashRouter as Router,
  Routes,
  Route,
  ScrollRestoration,
} from 'react-router-dom';
import { Suspense } from 'react';
import { RecoilRoot } from 'recoil';
import Profile from './pages/profile';
import Index from './pages/index';
import Comic from './pages/comic';
import './App.css';

export default function App() {
  return (
    <div className="bg-gray-300/20">
      <RecoilRoot>
        <Suspense fallback={<div>global loading...</div>}>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/comic/:id" element={<Comic />} />
              <Route path="/profile/:id" element={<Profile />} />
            </Routes>
          </Router>
        </Suspense>
      </RecoilRoot>
    </div>
  );
}
