import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import "./App.css";

// Import components
import Dashboard from "./components/Dashboard";
import ContactList from "./components/ContactList";
import ContactDetail from "./components/ContactDetail";
import CampaignList from "./components/CampaignList";
import CampaignCreate from "./components/CampaignCreate";
import EmailTemplates from "./components/EmailTemplates";
import EmailSequences from "./components/EmailSequences";
import Analytics from "./components/Analytics";
import Layout from "./components/Layout";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
            }}
          />
          
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="contacts" element={<ContactList />} />
              <Route path="contacts/:id" element={<ContactDetail />} />
              <Route path="campaigns" element={<CampaignList />} />
              <Route path="campaigns/create" element={<CampaignCreate />} />
              <Route path="templates" element={<EmailTemplates />} />
              <Route path="sequences" element={<EmailSequences />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
