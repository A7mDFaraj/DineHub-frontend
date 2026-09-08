const themeBootstrapScript = `(function(){try{var theme=localStorage.getItem('dinehub-landing-theme');if(theme==='dark'){document.documentElement.dataset.landingTheme='dark'}else{delete document.documentElement.dataset.landingTheme}var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#080c12':'#f7f3ed')}catch(e){}})()`;

export function ThemeBootstrapScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />;
}
