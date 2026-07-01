module.exports=[186362,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/redux/provider.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/redux/provider.tsx <module evaluation>","default")},166140,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/redux/provider.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/redux/provider.tsx","default")},445387,a=>{"use strict";a.i(186362);var b=a.i(166140);a.n(b)},991005,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/node_modules/next-intl/dist/esm/production/shared/NextIntlClientProvider.js <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/node_modules/next-intl/dist/esm/production/shared/NextIntlClientProvider.js <module evaluation>","default")},152265,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/node_modules/next-intl/dist/esm/production/shared/NextIntlClientProvider.js from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/node_modules/next-intl/dist/esm/production/shared/NextIntlClientProvider.js","default")},330543,a=>{"use strict";a.i(991005);var b=a.i(152265);a.n(b)},872123,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(211857);a.n(d("[project]/node_modules/next/dist/client/script.js <module evaluation>"))},944536,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(211857);a.n(d("[project]/node_modules/next/dist/client/script.js"))},411153,a=>{"use strict";a.i(872123);var b=a.i(944536);a.n(b)},371618,(a,b,c)=>{b.exports=a.r(411153)},827572,a=>{"use strict";var b=a.i(907997),c=a.i(445387),d=a.i(800717),e=a.i(767228);let f=(0,d.cache)(async function(a){return(await (0,e.default)(a)).now}),g=(0,d.cache)(async function(){return(await (0,e.default)()).formats});var h=a.i(330543);let i=(0,d.cache)(async function(a){return(await (0,e.default)(a)).timeZone});async function j(a){return i(a?.locale)}let k=(0,d.cache)(async function(a){var b=await (0,e.default)(a);if(!b.messages)throw Error("No messages found. Have you configured them correctly? See https://next-intl.dev/docs/configuration#messages");return b.messages});async function l(a){return k(a?.locale)}var m=a.i(747191);async function n({formats:a,locale:c,messages:d,now:e,timeZone:i,...k}){return(0,b.jsx)(h.default,{formats:void 0===a?await g():a,locale:c??await (0,m.default)(),messages:void 0===d?await l():d,now:e??await f(),timeZone:i??await j(),...k})}var o=a.i(371618);async function p({children:a}){let d=await l();return(0,b.jsxs)("html",{lang:"en",className:"h-full",suppressHydrationWarning:!0,children:[(0,b.jsxs)("head",{children:[(0,b.jsx)("link",{rel:"icon",href:"/anhoc.svg"}),(0,b.jsx)("link",{rel:"stylesheet",href:"https://tikzjax.com/v1/fonts.css"})]}),(0,b.jsxs)("body",{className:"bg-sol-bg h-full",children:[(0,b.jsx)(o.default,{src:"https://tikzjax.com/v1/tikzjax.js",strategy:"afterInteractive"}),(0,b.jsx)(o.default,{id:"theme-initializer",strategy:"beforeInteractive",dangerouslySetInnerHTML:{__html:`
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var appThemeRaw = localStorage.getItem('app-theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (!theme && supportDarkMode) theme = 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }

                  if (appThemeRaw) {
                    var appTheme = JSON.parse(appThemeRaw);
                    var variables = theme === 'dark' ? appTheme.dark_variables : appTheme.light_variables;
                    document.documentElement.setAttribute('data-app-theme', appTheme.slug || 'default');
                    if (variables && typeof variables === 'object') {
                      Object.entries(variables).forEach(function(entry) {
                        document.documentElement.style.setProperty(entry[0], entry[1]);
                      });
                    }
                  } else {
                    document.documentElement.setAttribute('data-app-theme', 'default');
                  }
                } catch (e) {}
              })();
            `}}),(0,b.jsx)(n,{messages:d,children:(0,b.jsx)(c.default,{children:a})})]})]})}a.s(["default",0,p,"metadata",0,{title:"Anhoc",description:"Anhoc learning platform"}],827572)},650645,a=>{a.n(a.i(827572))},5325,a=>{a.v(b=>Promise.all(["server/chunks/ssr/src_i18n_en_json_[json]_cjs_0rd1t8n._.js"].map(b=>a.l(b))).then(()=>b(878882)))},620066,a=>{a.v(b=>Promise.all(["server/chunks/ssr/src_i18n_vi_json_[json]_cjs_08wf~7~._.js"].map(b=>a.l(b))).then(()=>b(815971)))}];

//# sourceMappingURL=_0dcvi-q._.js.map