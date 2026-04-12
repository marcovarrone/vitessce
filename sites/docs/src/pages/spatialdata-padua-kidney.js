/* eslint-disable global-require */
import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function SpatialdataPaduaKidneyPage() {
  return (
    <Layout
      title="Padua SpatialData (Kidney Xenium + IF)"
      description="Vitessce demo for the Padua workshop Xenium Human Kidney FFPE SpatialData store (HE, IF, segmentations)."
    >
      <BrowserOnly fallback={<p>Loading…</p>}>
        {() => {
          const ThemedVitessce = require('./_ThemedVitessce.js').default;
          const { spatialdataPaduaKidneyXeniumConfig } = require('@vitessce/example-configs');
          return (
            <>
              <style>
                {`
                .navbar--fixed-top { position: relative; }
                #spatialdata-padua-kidney-root .vitessce-container {
                  height: min(90vh, 1200px);
                  width: 100%;
                }
              `}
              </style>
              <div id="spatialdata-padua-kidney-root">
                <ThemedVitessce config={spatialdataPaduaKidneyXeniumConfig} />
              </div>
            </>
          );
        }}
      </BrowserOnly>
    </Layout>
  );
}
