import React from 'react';
import Header from '../../components/Header';

const VideoGeneratorPage: React.FC = () => {
  const generatorUrl = "https://gerador-de-v-deo-ia-996242650699.us-west1.run.app/";

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 overflow-hidden">
        <iframe
          src={generatorUrl}
          title="Video Generator"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
};

export default VideoGeneratorPage;