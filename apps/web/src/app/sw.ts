/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 60 * 60 * 24;

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching: [
		//  App shell
		{
			matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
			handler: new CacheFirst({
				cacheName: "next-static",
				plugins: [new ExpirationPlugin({ maxEntries: 250, maxAgeSeconds: 30 * DAY })],
			}),
		},

		//  UploadThing book files (ufs.sh / utfs.io)
		{
			matcher: ({ url }) => url.hostname.endsWith("ufs.sh") || url.hostname.endsWith("utfs.io"),
			handler: new CacheFirst({
				cacheName: "book-files",
				plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * DAY })],
			}),
		},

		//  foliate-js scripts (served from /foliate-js/)
		{
			matcher: ({ url }) => url.pathname.startsWith("/foliate-js/"),
			handler: new CacheFirst({
				cacheName: "foliate-js",
				plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * DAY })],
			}),
		},

		//  PDF.js worker (served locally at /pdf.worker.min.mjs) 
		{
			matcher: ({ url }) => url.pathname === "/pdf.worker.min.mjs",
			handler: new CacheFirst({
				cacheName: "pdf-worker",
				plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 30 * DAY })],
			}),
		},

		//  tRPC API — network-first (allows offline reads from cache)
		{
			matcher: ({ url }) => url.pathname.startsWith("/api/trpc/"),
			handler: new NetworkFirst({
				cacheName: "trpc-api",
				networkTimeoutSeconds: 10,
				plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: DAY })],
			}),
		},

		//  Google Fonts stylesheets
		{
			matcher: ({ url }) => url.hostname === "fonts.googleapis.com",
			handler: new StaleWhileRevalidate({
				cacheName: "google-fonts-stylesheets",
			}),
		},

		//  Google Fonts files
		{
			matcher: ({ url }) => url.hostname === "fonts.gstatic.com",
			handler: new CacheFirst({
				cacheName: "google-fonts-webfonts",
				plugins: [
					new ExpirationPlugin({
						maxEntries: 30,
						maxAgeSeconds: 365 * DAY,
					}),
				],
			}),
		},

		//  Fallback to serwist defaultCache for everything else
		...defaultCache,
	],
	fallbacks: {
		entries: [
			{
				url: "/offline",
				matcher({ request }) {
					return request.destination === "document";
				},
			},
		],
	},
});

serwist.addEventListeners();
