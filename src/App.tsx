import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Components
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';
import HeroSection from './pages/HomePage/sections/HeroSection';
import CatalogPage from './pages/CatalogPage/CatalogPage';
import ContactSection from './pages/HomePage/sections/ContactSection';

const App: React.FC = () => {
  const { i18n } = useTranslation();

  // Update HTML lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="app">
      <Header />
      <LanguageSwitcher />
      <main>
        <HeroSection />
        <CatalogPage />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

export default App