// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { downloadBlob, openExternalFile } from "../lib/export";
import { PLANS, CATEGORIES, US_CA_STATES, planLive } from "../lib/constants";
import { actIcon, clientBy, isBookingPast, isPastMeetingNotif, CALL_SLOT_TIMES, isSlotStillOpen, slotKey, buildLiveGrowthSeries, growthMomTrend } from "../lib/helpers";
import { Badge, Card, Btn, Input, Select, Confirm, StatCard, ChartTip, SectionTitle, Empty, PageHead } from "../components/atoms";
import { Orbit } from "../components/Orbit";
import Shell from "../components/Shell";
import ChatThread from "../components/ChatThread";
import AccountSettings from "../components/AccountSettings";
import UserManual from "./UserManual";
import { useWindowSize, useToast } from "../hooks";

const ListingsLiveIcon=({size=28})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 55 55" fill="none" aria-hidden>
    <path fillRule="evenodd" clipRule="evenodd" d="M23.8889 12.4789L32.9414 39.5596C32.9531 39.5875 32.9625 39.618 32.9695 39.6459C33.0843 39.9554 33.302 40.204 33.5806 40.3435C33.8569 40.483 34.1754 40.5033 34.4681 40.3993C34.4915 40.3892 34.5149 40.379 34.5383 40.3714C35.1424 40.1076 35.4445 39.3744 35.222 38.7098L29.0545 20.2646C29.0405 20.2341 29.0264 20.2037 29.0171 20.1733C29.0054 20.1403 28.996 20.1098 28.9913 20.0743L26.151 11.5681C25.9216 10.8958 25.2355 10.5483 24.6127 10.7893C23.9898 11.0328 23.6644 11.771 23.8821 12.4484L23.8915 12.4788L23.8889 12.4789ZM42.4711 17.1594C45.8335 18.6663 49.7086 17.3218 51.6382 13.9782C53.5699 10.6372 52.9916 6.27401 50.2708 3.6555C47.5522 1.03751 43.4852 0.928402 40.6469 3.39674C37.8113 5.8651 37.034 10.193 38.8089 13.6331C38.8978 13.8107 38.9119 14.0212 38.8416 14.2064L37.5234 18.037V18.0396C37.4836 18.1487 37.4836 18.2679 37.5187 18.3795C37.5444 18.448 37.5796 18.5114 37.6287 18.5647C37.6779 18.618 37.7365 18.6586 37.7997 18.6865C37.9027 18.7245 38.0151 18.7245 38.1158 18.6814L42.0191 17.1441H42.0167C42.1642 17.0857 42.3258 17.0908 42.4686 17.1567L42.4711 17.1594ZM47.983 18.7424V18.7449C46.0887 19.3741 44.054 19.2853 42.2159 18.4913L38.542 19.9423V19.9398C38.1674 20.0946 37.753 20.0946 37.376 19.9449C37.1442 19.851 36.9334 19.7039 36.7579 19.5162C36.5822 19.3259 36.4464 19.1001 36.3598 18.849C36.2193 18.4406 36.2216 17.9941 36.3621 17.5856L37.5938 14.0087V14.0112C36.4956 11.6875 36.3294 8.97814 37.1325 6.51744C37.938 4.05668 39.6426 2.06526 41.8483 1.00993C44.0517 -0.0453969 46.5595 -0.0707895 48.7789 0.941435C51.001 1.95364 52.7384 3.9146 53.5837 6.35757C54.429 8.80307 54.3072 11.515 53.2465 13.8592C52.1858 16.2032 50.2798 17.9714 47.9804 18.7451L47.983 18.7424ZM45.4238 11.4668C45.7563 11.4795 46.0232 11.7738 46.0232 12.1365C46.0232 12.4993 45.7563 12.7935 45.4238 12.8062H40.6658C40.4972 12.8113 40.3357 12.7428 40.2162 12.6185C40.0968 12.4916 40.0289 12.3166 40.0289 12.1365C40.0289 11.9564 40.0968 11.7813 40.2162 11.6545C40.3357 11.5302 40.4972 11.4617 40.6658 11.4667L45.4238 11.4668ZM50.1068 9.01117C50.4416 9.02132 50.7062 9.31813 50.7062 9.68087C50.7062 10.0411 50.4416 10.3379 50.1068 10.348H40.6658C40.4972 10.3556 40.3357 10.2871 40.2162 10.1603C40.0968 10.0335 40.0289 9.86095 40.0289 9.68084C40.0289 9.49819 40.0968 9.32568 40.2162 9.19884C40.3357 9.072 40.4972 9.00603 40.6658 9.01111L50.1068 9.01117ZM50.1068 6.55554C50.4416 6.56569 50.7062 6.8625 50.7062 7.2227C50.7062 7.58547 50.4416 7.88226 50.1068 7.8924H40.6658C40.4972 7.89747 40.3357 7.83151 40.2162 7.70467C40.0968 7.57783 40.0289 7.40532 40.0289 7.22267C40.0289 7.04256 40.0968 6.87005 40.2162 6.74321C40.3357 6.61636 40.4972 6.54787 40.6658 6.55548L50.1068 6.55554ZM31.3351 38.6849C28.9444 37.7665 26.4367 37.2541 23.901 37.1654L18.4102 20.699C20.2904 18.8395 21.9013 16.6832 23.1892 14.3036L31.3354 38.6826L31.3351 38.6849ZM31.9111 40.3516H31.9088C29.2301 39.1694 26.3711 38.5378 23.4797 38.4896C21.7212 38.4591 19.9627 38.6418 18.2393 39.0274L18.7779 40.6256L18.7802 40.6281C18.7919 40.6585 18.8013 40.689 18.8083 40.722C18.9769 41.2547 18.9582 41.8382 18.7545 42.3582C18.5461 42.8859 18.1504 43.3019 17.6563 43.5124C17.6165 43.5327 17.5744 43.548 17.5322 43.5581L16.8227 43.8143L18.6773 49.5019H18.6796C19.1292 50.6207 18.9535 51.917 18.2253 52.8455C17.9256 53.2336 17.5533 53.5481 17.1342 53.7714C16.7151 53.9947 16.2585 54.1215 15.7925 54.1393C14.706 54.1925 13.6875 53.571 13.163 52.5385L13.1419 52.498 7.77753 42.2843C5.67252 42.3325 3.65179 41.4116 2.20938 39.7526C2.19299 39.7348 2.1766 39.7171 2.16021 39.6968C0.130131 37.302 -0.373329 33.8214 0.886428 30.8684C1.71064 28.9556 3.19986 27.4715 5.03093 26.746C6.49905 26.1067 8.04677 25.5765 9.52664 24.9575C12.3576 23.8616 14.9706 22.1949 17.2305 20.0436C19.4385 17.9482 21.2719 15.4316 22.644 12.6206C22.349 11.2583 23.0842 9.88341 24.3206 9.48511C25.5569 9.08429 26.8658 9.79968 27.3084 11.1112L29.9847 19.1226H29.9823C32.6774 18.4199 35.431 20.0055 36.4004 22.8163C36.4145 22.8492 36.4262 22.8848 36.4355 22.9203C37.3628 25.7565 36.1873 28.8945 33.6983 30.2264L36.377 38.2579C36.5995 38.915 36.569 39.643 36.2974 40.2773C36.0235 40.9115 35.527 41.4036 34.9206 41.6421H34.9159C34.3095 41.8806 33.6398 41.8476 33.0567 41.5508C32.5603 41.3022 32.1576 40.8785 31.9094 40.3508L31.9111 40.3516ZM17.0286 39.3343C16.5228 39.4764 16.0194 39.6362 15.5206 39.8138L16.4151 42.5587L17.1855 42.2796C17.3822 42.2035 17.5414 42.0412 17.621 41.8306C17.71 41.6048 17.7147 41.3537 17.6351 41.1229L17.0286 39.3343ZM14.7901 38.6697C15.6026 38.3678 16.4245 38.1091 17.2557 37.896L17.2978 37.8858C19.0329 37.4419 20.8078 37.1983 22.592 37.1578L17.4102 21.6376C15.345 23.4768 13.0199 24.9457 10.5264 25.9883L14.7903 38.675L14.7901 38.6697ZM2.82728 38.4896L4.7801 37.7615C5.10089 37.6423 5.45212 37.83 5.56451 38.1776C5.67456 38.5276 5.50129 38.9082 5.1805 39.0274L3.81777 39.5348C5.49898 40.9503 7.73275 41.3308 9.73477 40.547L13.6264 39.1112L9.36948 26.4472L5.45918 27.9998H5.46152C3.93484 28.6035 2.6915 29.8389 2.00546 31.4347C1.79473 31.9217 1.64018 32.4317 1.54418 32.9568L2.97951 32.3733C3.29561 32.249 3.64685 32.4266 3.76392 32.7691C3.88099 33.1116 3.72177 33.4921 3.40801 33.624L1.42942 34.4282V34.4256C1.44347 34.9482 1.51371 35.4658 1.63782 35.9706L5.95322 34.2252C6.10776 34.1593 6.28103 34.1618 6.43323 34.2328C6.58543 34.3064 6.7025 34.4434 6.76104 34.6108C6.81958 34.7808 6.81256 34.966 6.73997 35.1309C6.66972 35.2932 6.54094 35.4176 6.38406 35.4759L2.07334 37.2187C2.27939 37.6728 2.53226 38.099 2.82728 38.4896ZM33.2716 28.9663L30.4056 20.3893C32.4708 19.9326 34.5337 21.1808 35.2573 23.3244C35.9784 25.4782 35.1332 27.878 33.2717 28.9638L33.2716 28.9663ZM9.10749 42.1225L14.2237 51.864H14.2261C14.5281 52.4678 15.1229 52.8331 15.7574 52.8077C16.0478 52.795 16.3358 52.7164 16.5957 52.5743C16.8603 52.4348 17.0944 52.2369 17.284 51.9934C17.7125 51.4353 17.8109 50.6615 17.5369 49.9994L14.3595 40.2527L10.1471 41.8053C9.8076 41.9372 9.46109 42.0439 9.10749 42.1225Z" fill="#214585" stroke="#214585" strokeWidth="0.4"/>
  </svg>
);

/** Shared brand blue for home stat icons (matches ListingsLiveIcon). */
const ICOL="#214585";

/** NAP Score — clipboard + check: Name / Address / Phone consistency. */
const NapScoreIcon=({size=28})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 55 55" fill="none" aria-hidden>
    <path fillRule="evenodd" clipRule="evenodd" d="M20.5 6.2C20.5 4.29 22.04 2.75 23.95 2.75H31.05C32.96 2.75 34.5 4.29 34.5 6.2V8.1H38.2C40.52 8.1 42.4 9.98 42.4 12.3V46.2C42.4 48.52 40.52 50.4 38.2 50.4H16.8C14.48 50.4 12.6 48.52 12.6 46.2V12.3C12.6 9.98 14.48 8.1 16.8 8.1H20.5V6.2ZM24.3 6.55V9.9H30.7V6.55H24.3ZM16.8 11.9C16.58 11.9 16.4 12.08 16.4 12.3V46.2C16.4 46.42 16.58 46.6 16.8 46.6H38.2C38.42 46.6 38.6 46.42 38.6 46.2V12.3C38.6 12.08 38.42 11.9 38.2 11.9H34.5V14.2C34.5 15.14 33.74 15.9 32.8 15.9H22.2C21.26 15.9 20.5 15.14 20.5 14.2V11.9H16.8Z" fill={ICOL} stroke={ICOL} strokeWidth="0.35"/>
    <path d="M19.8 22.4H28.6C29.26 22.4 29.8 22.94 29.8 23.6C29.8 24.26 29.26 24.8 28.6 24.8H19.8C19.14 24.8 18.6 24.26 18.6 23.6C18.6 22.94 19.14 22.4 19.8 22.4Z" fill={ICOL}/>
    <path d="M19.8 29.1H26.4C27.06 29.1 27.6 29.64 27.6 30.3C27.6 30.96 27.06 31.5 26.4 31.5H19.8C19.14 31.5 18.6 30.96 18.6 30.3C18.6 29.64 19.14 29.1 19.8 29.1Z" fill={ICOL}/>
    <path d="M19.8 35.8H24.2C24.86 35.8 25.4 36.34 25.4 37C25.4 37.66 24.86 38.2 24.2 38.2H19.8C19.14 38.2 18.6 37.66 18.6 37C18.6 36.34 19.14 35.8 19.8 35.8Z" fill={ICOL}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M39.85 28.15C40.55 28.72 40.65 29.75 40.08 30.45L33.35 38.7C33.02 39.1 32.52 39.35 31.98 39.38C31.44 39.41 30.92 39.2 30.55 38.82L27.05 35.15C26.42 34.49 26.45 33.44 27.12 32.82C27.78 32.19 28.83 32.22 29.46 32.88L31.8 35.35L37.95 27.85C38.52 27.15 39.55 27.05 40.25 27.62L39.85 28.15Z" fill={ICOL} stroke={ICOL} strokeWidth="0.3"/>
  </svg>
);

/** Edits Blocked — shield + ban: unauthorized changes stopped. */
const EditsBlockedIcon=({size=28})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 55 55" fill="none" aria-hidden>
    <path fillRule="evenodd" clipRule="evenodd" d="M27.5 2.8C28.15 2.8 28.78 3.02 29.28 3.42L42.55 14.2C43.28 14.8 43.7 15.7 43.7 16.65V30.9C43.7 37.55 39.85 43.55 33.95 46.35L28.55 48.95C27.88 49.28 27.12 49.28 26.45 48.95L21.05 46.35C15.15 43.55 11.3 37.55 11.3 30.9V16.65C11.3 15.7 11.72 14.8 12.45 14.2L25.72 3.42C26.22 3.02 26.85 2.8 27.5 2.8ZM27.5 6.7L15.1 16.75V30.9C15.1 36.05 18.05 40.7 22.55 42.85L27.5 45.2L32.45 42.85C36.95 40.7 39.9 36.05 39.9 30.9V16.75L27.5 6.7Z" fill={ICOL} stroke={ICOL} strokeWidth="0.35"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M27.5 16.2C32.3 16.2 36.2 20.1 36.2 24.9C36.2 29.7 32.3 33.6 27.5 33.6C22.7 33.6 18.8 29.7 18.8 24.9C18.8 20.1 22.7 16.2 27.5 16.2ZM27.5 19.5C24.52 19.5 22.1 21.92 22.1 24.9C22.1 26.05 22.45 27.1 23.05 27.98L30.58 20.45C29.7 19.85 28.65 19.5 27.5 19.5ZM31.95 21.82L24.42 29.35C25.3 29.95 26.35 30.3 27.5 30.3C30.48 30.3 32.9 27.88 32.9 24.9C32.9 23.75 32.55 22.7 31.95 21.82Z" fill={ICOL} stroke={ICOL} strokeWidth="0.3"/>
  </svg>
);

/** Directories — globe of listing nodes: managed directory network. */
const DirectoriesIcon=({size=28})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 55 55" fill="none" aria-hidden>
    <path fillRule="evenodd" clipRule="evenodd" d="M27.5 4C40.48 4 51 14.52 51 27.5C51 40.48 40.48 51 27.5 51C14.52 51 4 40.48 4 27.5C4 14.52 14.52 4 27.5 4ZM27.5 7.6C16.51 7.6 7.6 16.51 7.6 27.5C7.6 38.49 16.51 47.4 27.5 47.4C38.49 47.4 47.4 38.49 47.4 27.5C47.4 16.51 38.49 7.6 27.5 7.6Z" fill={ICOL} stroke={ICOL} strokeWidth="0.35"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M27.5 7.6C29.9 10.85 31.4 18.2 31.4 27.5C31.4 36.8 29.9 44.15 27.5 47.4C25.1 44.15 23.6 36.8 23.6 27.5C23.6 18.2 25.1 10.85 27.5 7.6ZM27.5 11.85C26.35 14.55 25.4 20.4 25.4 27.5C25.4 34.6 26.35 40.45 27.5 43.15C28.65 40.45 29.6 34.6 29.6 27.5C29.6 20.4 28.65 14.55 27.5 11.85Z" fill={ICOL}/>
    <path d="M9.2 21.3H45.8C46.52 21.3 47.1 21.88 47.1 22.6C47.1 23.32 46.52 23.9 45.8 23.9H9.2C8.48 23.9 7.9 23.32 7.9 22.6C7.9 21.88 8.48 21.3 9.2 21.3Z" fill={ICOL}/>
    <path d="M9.2 31.1H45.8C46.52 31.1 47.1 31.68 47.1 32.4C47.1 33.12 46.52 33.7 45.8 33.7H9.2C8.48 33.7 7.9 33.12 7.9 32.4C7.9 31.68 8.48 31.1 9.2 31.1Z" fill={ICOL}/>
    <circle cx="27.5" cy="27.5" r="3.2" fill={ICOL}/>
    <circle cx="14.5" cy="16.5" r="2.2" fill={ICOL}/>
    <circle cx="40.5" cy="16.5" r="2.2" fill={ICOL}/>
    <circle cx="14.5" cy="38.5" r="2.2" fill={ICOL}/>
    <circle cx="40.5" cy="38.5" r="2.2" fill={ICOL}/>
  </svg>
);

/** Pending — clock: listing awaiting approval. */
const PendingIcon=({size=28})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 55 55" fill="none" aria-hidden>
    <path fillRule="evenodd" clipRule="evenodd" d="M27.5 4C40.48 4 51 14.52 51 27.5C51 40.48 40.48 51 27.5 51C14.52 51 4 40.48 4 27.5C4 14.52 14.52 4 27.5 4ZM27.5 7.7C16.56 7.7 7.7 16.56 7.7 27.5C7.7 38.44 16.56 47.3 27.5 47.3C38.44 47.3 47.3 38.44 47.3 27.5C47.3 16.56 38.44 7.7 27.5 7.7Z" fill={ICOL} stroke={ICOL} strokeWidth="0.35"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M27.5 13.2C28.52 13.2 29.35 14.03 29.35 15.05V26.35L36.55 30.55C37.42 31.05 37.7 32.17 37.2 33.04C36.7 33.91 35.58 34.19 34.71 33.69L26.66 29.05C26.05 28.7 25.65 28.05 25.65 27.35V15.05C25.65 14.03 26.48 13.2 27.5 13.2Z" fill={ICOL} stroke={ICOL} strokeWidth="0.3"/>
    <circle cx="27.5" cy="27.5" r="2.6" fill={ICOL}/>
    <path d="M24.2 8.4H30.8C31.52 8.4 32.1 8.98 32.1 9.7C32.1 10.42 31.52 11 30.8 11H24.2C23.48 11 22.9 10.42 22.9 9.7C22.9 8.98 23.48 8.4 24.2 8.4Z" fill={ICOL}/>
  </svg>
);

/** Stable module-level components (hooks) — must NOT be declared inside ClientDashboard. */
function ProfileGate({user,onSaved,toast,isMobile}){
  const[f,setF]=useState({businessName:user.businessName||"",phone:user.phone||"",address:user.address||"",city:user.city||"",state:user.state||"",category:user.category||"Home Services",website:user.website||"",gbpId:user.gbpId||""});
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const[saving,setSaving]=useState(false);
  const[tried,setTried]=useState(false);
  const ok=f.businessName&&f.phone.replace(/\D/g,"").length>=10&&f.address&&f.city&&f.state;
  const save=async()=>{if(!ok){setTried(true);return;}setSaving(true);try{await api.patchProfile(user.id,f);await onSaved();toast("Business profile saved");}catch(e){toast("Could not save: "+(e.message||"unknown error"),"info");}setSaving(false);};
  const req=(k)=>tried&&!f[k]?`Required`:"";
  return(<Card style={{marginBottom:20,background:`linear-gradient(135deg,${T.brandSoft},#fff)`,maxWidth:640}}>
    <SectionTitle sub="Tell us about your business so we can list it correctly everywhere. Takes one minute, then choose your plan.">First, complete your business profile</SectionTitle>
    <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing" error={req("businessName")}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
      <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000" validate="usphone" error={tried&&f.phone.replace(/\D/g,"").length<10?"Valid US/Canada number required":""}/>
      <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={CATEGORIES.map(o=>({value:o,label:o}))}/>
    </div>
    <Input label="Street Address" value={f.address} onChange={v=>set("address",v)} placeholder="123 Main St" error={req("address")}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
      <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin" error={req("city")}/>
      <Select label="State / Province" value={f.state} onChange={v=>set("state",v)} options={[{value:"",label:"Select…"},...US_CA_STATES.map(s=>({value:s.code,label:`${s.code} — ${s.name}`}))]}/>
    </div>
    {tried&&!f.state&&<div style={{fontSize:11,color:T.red,marginTop:-8,marginBottom:10,fontWeight:600}}>State / Province is required</div>}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
      <Input label="Website (optional)" value={f.website} onChange={v=>set("website",v)} placeholder="mikesplumbing.com"/>
      <Input label="Google Business Profile link (optional)" value={f.gbpId} onChange={v=>set("gbpId",v)} placeholder="Paste your GMB link"/>
    </div>
    <Btn style={{marginTop:6}} onClick={save} disabled={saving}>{saving?"Saving…":"Save & continue to plans →"}</Btn>
    {tried&&!ok&&<div style={{fontSize:11.5,color:T.red,marginTop:8,fontWeight:600}}>Please fill all required fields (marked *) to continue.</div>}
  </Card>);
}

function ReportCard({user,reload,toast}){
  const[email,setEmail]=useState(user.reportEmail||user.email||"");
  const[saving,setSaving]=useState(false);
  const sent=user.reportSentMonth;
  const save=async()=>{setSaving(true);try{await api.patchProfile(user.id,{reportEmail:email});await reload();toast("Report email saved");}catch(e){toast("Could not save","info");}setSaving(false);};
  return(<Card style={{marginBottom:16}}>
    <SectionTitle sub="Your detailed monthly GMB performance report, delivered to your inbox by your account manager.">Monthly Report</SectionTitle>
    {sent&&<div style={{padding:"11px 14px",background:T.greenSoft,borderRadius:11,marginBottom:14,fontSize:12.5,color:T.green,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      Report sent for {sent}
    </div>}
    <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
      <div style={{flex:"1 1 240px"}}><Input label="Send my report to" value={email} onChange={setEmail} placeholder="you@business.com" validate="email"/></div>
      <Btn onClick={save} disabled={saving} style={{marginBottom:14}}>{saving?"Saving…":"Save email"}</Btn>
    </div>
  </Card>);
}

function ClientCallPage({user,isMobile,toast,reload,onOpenMessages}){
  const now=new Date();
  const nowY=now.getFullYear();
  const nowM=now.getMonth();
  const startOfToday=new Date(nowY,nowM,now.getDate());
  const maxView=new Date(nowY,nowM+2,1); // current + next 2 months
  const[viewY,setViewY]=useState(nowY);
  const[viewM,setViewM]=useState(nowM);
  const monthName=new Date(viewY,viewM,1).toLocaleString("en-US",{month:"long"});
  const totalDays=new Date(viewY,viewM+1,0).getDate();
  const firstDay=new Date(viewY,viewM,1).getDay();
  const[selDay,setSelDay]=useState(null);
  const[selTime,setSelTime]=useState(null);
  const[note,setNote]=useState("");
  const[busy,setBusy]=useState(false);
  const[bdm,setBdm]=useState(null);
  const[supportPeer,setSupportPeer]=useState(false);
  const[bookings,setBookings]=useState([]);
  const[takenSlots,setTakenSlots]=useState([]);
  const[showScheduler,setShowScheduler]=useState(false);
  const[rescheduleId,setRescheduleId]=useState(null);
  const[loadingCall,setLoadingCall]=useState(true);
  const[confirm,setConfirm]=useState(null);
  const shiftMonth=(delta)=>{
    const d=new Date(viewY,viewM+delta,1);
    const min=new Date(nowY,nowM,1);
    if(d<min||d>maxView)return;
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
    setSelDay(null);
    setSelTime(null);
  };
  const canPrev=new Date(viewY,viewM,1)>new Date(nowY,nowM,1);
  const canNext=new Date(viewY,viewM+1,1)<=maxView;
  const loadCall=async()=>{
    setLoadingCall(true);
    try{
      const r=await api.getMyBdm();
      setBdm(r.agent||null);
      setSupportPeer(!!r.support||!!r.needsBdm);
      const rows=r.bookings||[];
      setBookings(rows);
      setTakenSlots(Array.isArray(r.takenSlots)?r.takenSlots:[]);
      const hasActive=rows.some(b=>(b.status==="pending"||b.status==="confirmed")&&!isBookingPast(b.slotDate,b.slotTime));
      if(hasActive&&!rescheduleId)setShowScheduler(false);
    }finally{
      setLoadingCall(false);
    }
  };
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoadingCall(true);
      const r=await api.getMyBdm();
      if(cancelled)return;
      setBdm(r.agent||null);
      setSupportPeer(!!r.support||!!r.needsBdm);
      const rows=r.bookings||[];
      setBookings(rows);
      setTakenSlots(Array.isArray(r.takenSlots)?r.takenSlots:[]);
      if(rows.some(b=>(b.status==="pending"||b.status==="confirmed")&&!isBookingPast(b.slotDate,b.slotTime)))setShowScheduler(false);
      setLoadingCall(false);
    })();
    return()=>{cancelled=true;};
  },[user.id,user.assignedAgentId]);
  const upcomingBookings=bookings.filter(b=>!isBookingPast(b.slotDate,b.slotTime));
  const activeBooking=upcomingBookings.find(b=>b.status==="confirmed")||upcomingBookings.find(b=>b.status==="pending")||null;
  const showCalendar=!loadingCall&&(showScheduler||!activeBooking);
  const times=CALL_SLOT_TIMES;
  const bdmLabel=supportPeer?(bdm?.name||"a team member"):(bdm?.name||bdm?.email||"your BDM");
  const slotDateLabel=selDay?`${monthName} ${selDay}, ${viewY}`:"";
  const takenKeys=new Set((takenSlots||[]).map(s=>slotKey(s.slotDate,s.slotTime)));
  // While rescheduling, keep the current slot selectable until the new booking replaces it.
  const freeOwnSlot=rescheduleId&&activeBooking?slotKey(activeBooking.slotDate,activeBooking.slotTime):null;
  const availableTimes=selDay
    ? times.filter(t=>{
        const k=slotKey(slotDateLabel,t);
        if(takenKeys.has(k)&&k!==freeOwnSlot)return false;
        return isSlotStillOpen(slotDateLabel,t);
      })
    : [];
  const dayHasSlots=(day)=>{
    const label=`${monthName} ${day}, ${viewY}`;
    return times.some(t=>{
      const k=slotKey(label,t);
      if(takenKeys.has(k)&&k!==freeOwnSlot)return false;
      return isSlotStillOpen(label,t);
    });
  };
  const confirmBooking=async()=>{
    if(!selDay||!selTime)return;
    setBusy(true);
    const r=await api.bookCall({
      slotDate:slotDateLabel,
      slotTime:selTime,
      note,
      replaceBookingId:rescheduleId||undefined,
    });
    setBusy(false);
    if(r.error){toast(r.error,"info");return;}
    if(r.agent){setBdm(r.agent);setSupportPeer(!!r.support||!!r.needsBdm);}
    toast(rescheduleId
      ?"Rescheduled — waiting for confirmation"
      :(r.support||supportPeer)
        ?"Request sent — a team member will confirm"
        :"Request sent — waiting for your BDM to confirm");
    setSelDay(null);setSelTime(null);setNote("");
    setShowScheduler(false);
    setRescheduleId(null);
    await loadCall();
    await reload();
  };
  const cancelMeeting=async()=>{
    if(!activeBooking?.id)return;
    setBusy(true);
    const r=await api.cancelCall({bookingId:activeBooking.id});
    setBusy(false);
    if(r.error){toast(r.error,"info");return;}
    toast("Meeting cancelled");
    setShowScheduler(false);
    setRescheduleId(null);
    await loadCall();
    await reload();
  };
  const startReschedule=()=>{
    if(!activeBooking?.id)return;
    setRescheduleId(activeBooking.id);
    setShowScheduler(true);
    setSelDay(null);
    setSelTime(null);
  };
  const statusLabel=(s)=>({pending:"Awaiting BDM confirmation",confirmed:"Confirmed"}[s]||s);
  const statusColor=(s)=>s==="confirmed"?T.green:T.amber;
  return(<div>
    <PageHead isMobile={isMobile} title="Book a Call" sub={bdm?`30 minutes with ${supportPeer?(bdm.name||"our team"):(bdm.name||"your BDM")}`:"30 minutes with your dedicated Business Development Manager"}/>
    {loadingCall&&(
      <Card style={{marginBottom:16,padding:28,textAlign:"center",color:T.faint,fontSize:13}}>
        Loading your meeting…
      </Card>
    )}

    {!loadingCall&&bdm&&(<Card style={{marginBottom:16,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".7px"}}>{supportPeer?"YOUR TEAM CONTACT":"YOUR BDM"}</div>
        <div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>{bdm.name||(supportPeer?"Team support":"Assigned manager")}</div>
        {bdm.email&&<div style={{fontSize:12.5,color:T.sub}}>{bdm.email}</div>}
      </div>
      <div style={{fontSize:12,color:T.sub}}>
        {supportPeer
          ?"No dedicated BDM yet — a manager can take this call and assign one."
          :"You'll get matched automatically when you subscribe if you don't have one yet."}
      </div>
    </Card>)}

    {!loadingCall&&!bdm&&(
      <Card style={{marginBottom:16,padding:"14px 16px",background:T.amberSoft,border:`1.5px solid ${T.amber}33`}}>
        <div style={{fontSize:13,fontWeight:800,color:T.amber,marginBottom:6}}>Team temporarily unavailable</div>
        <div style={{fontSize:12.5,color:T.sub,lineHeight:1.45,marginBottom:10}}>No agent or manager is free to take calls right now. Try again shortly, or message us.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn variant="soft" size="sm" onClick={()=>loadCall()}>Try again</Btn>
          {typeof onOpenMessages==="function"&&<Btn size="sm" onClick={onOpenMessages}>Open Messages →</Btn>}
        </div>
      </Card>
    )}

    {!loadingCall&&activeBooking&&!showScheduler&&(
      <Card style={{marginBottom:16,background:`linear-gradient(135deg,${activeBooking.status==="confirmed"?T.greenSoft:T.amberSoft},#fff)`,border:`1.5px solid ${activeBooking.status==="confirmed"?T.green:T.amber}33`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:".7px",color:statusColor(activeBooking.status)}}>YOUR MEETING</div>
            <div style={{fontFamily:FONT_D,fontSize:20,fontWeight:800,marginTop:4}}>
              {activeBooking.slotDate} · {activeBooking.slotTime}
            </div>
          </div>
          <span style={{fontSize:11.5,fontWeight:800,color:statusColor(activeBooking.status),background:"#fff",padding:"5px 12px",borderRadius:20}}>
            {statusLabel(activeBooking.status)}
          </span>
        </div>
        <div style={{fontSize:13.5,color:T.ink,marginBottom:6}}>
          With <b>{activeBooking.agent?.name||bdmLabel}</b>
          {activeBooking.agent?.email?` · ${activeBooking.agent.email}`:""}
        </div>
        {activeBooking.note&&<div style={{fontSize:12.5,color:T.sub,marginBottom:10}}>Note: {activeBooking.note}</div>}
        {activeBooking.status==="pending"&&(
          <div style={{fontSize:12.5,color:T.sub,marginBottom:12}}>
            {supportPeer
              ?"A team member will confirm and share a Zoom link here. Your dedicated BDM is being assigned."
              :"Your BDM will confirm and share a Zoom link here."}
          </div>
        )}
        {activeBooking.meetingUrl?(
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
            <a href={activeBooking.meetingUrl} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"11px 18px",background:T.brand,color:"#fff",borderRadius:12,fontWeight:800,fontSize:13.5,textDecoration:"none",fontFamily:FONT_B}}>
              Join Zoom meeting →
            </a>
            <button type="button" onClick={()=>{navigator.clipboard?.writeText(activeBooking.meetingUrl);toast("Meeting link copied");}}
              style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:12,padding:"11px 14px",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,color:T.sub}}>
              Copy link
            </button>
          </div>
        ):activeBooking.status==="confirmed"?(
          <div style={{padding:"12px 14px",background:T.amberSoft,borderRadius:12,marginBottom:12}}>
            <div style={{fontSize:12.5,color:T.amber,fontWeight:700,marginBottom:8}}>Confirmed — join link not shared yet.</div>
            <div style={{fontSize:12,color:T.sub,marginBottom:12,lineHeight:1.45}}>Message your BDM and ask for the Zoom link, or refresh this page after they send it.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {typeof onOpenMessages==="function"&&(
                <Btn size="sm" onClick={onOpenMessages}>Message BDM →</Btn>
              )}
              <Btn variant="soft" size="sm" onClick={()=>loadCall()}>Refresh</Btn>
            </div>
          </div>
        ):null}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
          <Btn variant="soft" size="sm" disabled={busy} onClick={startReschedule}>Reschedule</Btn>
          <Btn variant="danger" size="sm" disabled={busy} onClick={()=>setConfirm({
            title:"Cancel this meeting?",
            msg:`Cancel ${activeBooking.slotDate} at ${activeBooking.slotTime}? Your BDM will be notified.`,
            danger:true,
            yes:"Cancel meeting",
            onYes:cancelMeeting,
          })}>Cancel meeting</Btn>
        </div>
      </Card>
    )}

    {showCalendar&&bdm&&(
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 0.8fr",gap:16}}>
      <Card>
        {rescheduleId&&(
          <div style={{padding:"10px 12px",background:T.amberSoft,borderRadius:11,marginBottom:12,fontSize:12.5,color:T.amber,fontWeight:700,display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <span>Pick a new time — your current meeting is replaced when you confirm.</span>
            <Btn variant="ghost" size="sm" onClick={()=>{setRescheduleId(null);setShowScheduler(false);setSelDay(null);setSelTime(null);}}>Keep current</Btn>
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:12}}>
          <button type="button" disabled={!canPrev} onClick={()=>shiftMonth(-1)}
            style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${T.line}`,background:canPrev?T.surface2:T.surface,color:canPrev?T.ink:T.faint,cursor:canPrev?"pointer":"default",fontWeight:800,fontFamily:FONT_B}}>‹</button>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800}}>{monthName} {viewY}</div>
          <button type="button" disabled={!canNext} onClick={()=>shiftMonth(1)}
            style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${T.line}`,background:canNext?T.surface2:T.surface,color:canNext?T.ink:T.faint,cursor:canNext?"pointer":"default",fontWeight:800,fontFamily:FONT_B}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:10.5,color:T.faint,fontWeight:800,padding:"3px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:totalDays}).map((_,i)=>{
            const day=i+1;
            const isSel=selDay===day;
            const cell=new Date(viewY,viewM,day);
            const isPast=cell<startOfToday;
            const isWknd=(firstDay+i)%7===0||(firstDay+i)%7===6;
            const noSlots=!isPast&&!isWknd&&!dayHasSlots(day);
            const dead=isPast||isWknd||noSlots;
            return(<div key={day} onClick={()=>!dead&&(setSelDay(day),setSelTime(null))} style={{textAlign:"center",padding:"8px 2px",borderRadius:10,fontSize:12.5,fontWeight:isSel?800:600,cursor:dead?"default":"pointer",background:isSel?T.brand:dead?"transparent":T.surface2,color:isSel?"#fff":dead?T.faint:T.ink,position:"relative",transition:"all .15s"}}>
              {day}
            </div>);
          })}
        </div>
      </Card>
      <Card>
        {selDay?(<>
          <SectionTitle sub="Open 30-minute slots with your BDM">{slotDateLabel}</SectionTitle>
          {availableTimes.length===0?(
            <Empty icon="📅" title="No open times" sub="All slots for this day are booked or past. Try another weekday."/>
          ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {availableTimes.map(t=>{const isSel=selTime===t;
              return(<div key={t} onClick={()=>setSelTime(t)} style={{padding:"10px 8px",borderRadius:10,textAlign:"center",border:`1.5px solid ${isSel?T.brand:T.line}`,background:isSel?T.brandSoft:T.surface,color:isSel?T.brand:T.ink,fontSize:12.5,fontWeight:isSel?800:600,cursor:"pointer",transition:"all .15s"}}>{t}</div>);})}
          </div>
          )}
          {selTime&&availableTimes.includes(selTime)&&(<div className="pop" style={{marginTop:14}}>
            <div style={{padding:13,background:T.greenSoft,borderRadius:12,marginBottom:12}}>
              <div style={{fontSize:13,color:T.green,fontWeight:800}}>✓ {slotDateLabel} at {selTime}</div>
              <div style={{fontSize:11.5,color:T.sub,marginTop:2}}>30 min with {bdmLabel}</div>
            </div>
            <Btn variant="green" style={{width:"100%"}} onClick={confirmBooking} disabled={busy}>
              {busy?"Saving…":rescheduleId?"Confirm new time":"Confirm Booking"}
            </Btn>
          </div>)}
        </>):(<Empty icon="📅" title="Pick a date" sub="Choose a weekday with open times. You can browse this month and the next two."/>)}
      </Card>
      <Card>
        <SectionTitle>What we'll cover</SectionTitle>
        {["Your listings progress","NAP score walkthrough","Next month's targets","Plan questions"].map((item,i)=>(<div key={i} style={{display:"flex",gap:9,marginBottom:10,alignItems:"center"}}>
          <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>✓</div>
          <span style={{fontSize:12.5,color:T.sub}}>{item}</span>
        </div>))}
        <div style={{height:1,background:T.line,margin:"14px 0"}}/>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note with your booking request" style={{width:"100%",padding:"10px 13px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:12.5,resize:"none",height:74,boxSizing:"border-box",fontFamily:FONT_B}}/>
        <div style={{marginTop:12,padding:"12px 13px",background:T.brandSoft,borderRadius:12}}>
          <div style={{fontSize:12.5,fontWeight:800,color:T.brand,marginBottom:4}}>Need to chat with {bdmLabel}?</div>
          <div style={{fontSize:12,color:T.sub,marginBottom:10,lineHeight:1.45}}>Use Messages for ongoing chat — Book a Call is for scheduling only.</div>
          <Btn variant="soft" size="sm" style={{width:"100%"}} onClick={()=>onOpenMessages?.()}>Open Messages →</Btn>
        </div>
      </Card>
    </div>)}
    {confirm&&<Confirm data={confirm} onClose={()=>setConfirm(null)}/>}
  </div>);
}

function ClientLegalPage({isMobile}){
  const[tab,setTab]=useState("terms");
  const co="NAP Orbit";const eff=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const H=({children})=>(<div style={{fontSize:13.5,fontWeight:800,fontFamily:FONT_D,color:T.ink,margin:"8px 0 3px"}}>{children}</div>);
  const P=({children})=>(<p style={{fontSize:12.5,color:T.sub,lineHeight:1.55,margin:"0 0 6px"}}>{children}</p>);
  return(<div>
    <div style={{marginBottom:6}}>
      <div style={{fontFamily:FONT_D,fontSize:isMobile?20:22,fontWeight:800,letterSpacing:"-.5px",lineHeight:1.1}}>Terms & Privacy</div>
      <div style={{fontSize:12,color:T.sub,marginTop:2}}>Effective {eff}</div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:6}}>
      {[["terms","Terms of Service"],["privacy","Privacy Policy"]].map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:"5px 12px",borderRadius:18,border:`1.5px solid ${tab===id?T.brand:T.line}`,background:tab===id?T.brandSoft:T.surface,color:tab===id?T.brand:T.sub,fontSize:12,fontWeight:tab===id?800:600,cursor:"pointer",fontFamily:FONT_B}}>{l}</button>))}
    </div>
    <Card style={{maxWidth:820,padding:isMobile?12:14}}>
      <div style={{padding:"7px 10px",background:T.amberSoft,borderRadius:8,marginBottom:6,fontSize:11,color:T.amber,lineHeight:1.4}}>
        <b>Template notice:</b> This is a starting-point document. Have it reviewed by a qualified lawyer in your jurisdiction before relying on it for real clients.
      </div>
      {tab==="terms"?(<div>
        <H>1. Agreement</H>
        <P>These Terms of Service govern your use of the {co} platform and services ("Services"). By creating an account or subscribing, you agree to these terms. If you are accepting on behalf of a business, you confirm you are authorized to bind that business.</P>
        <H>2. The Services</H>
        <P>{co} provides local business visibility services, including directory listing submissions and management, NAP (Name, Address, Phone) consistency monitoring, unauthorized-edit protection, and, on eligible plans, Google Business Profile management. Deliverables and volumes depend on your selected plan.</P>
        <H>3. Subscriptions and Billing</H>
        <P>Services are billed as recurring monthly subscriptions via our payment processor (Stripe). Your subscription renews automatically each month until cancelled. By subscribing, you authorize {co} to charge your payment method on each renewal date.</P>
        <H>4. Cancellation</H>
        <P>You may cancel at any time from your billing dashboard. Cancellation takes effect at the end of your current billing period: you retain full access until that date, and you will not be charged for the following period. To avoid the next charge, you must cancel before your renewal date.</P>
        <H>5. No Refunds</H>
        <P><b>All fees are non-refundable.</b> Due to the nature of the Services, which involve immediate allocation of work, third-party submissions, and labor performed on your behalf, any amount you have already paid is not refundable, in whole or in part, including for partial billing periods, unused quota, or after cancellation. This clause applies to the fullest extent permitted by law.</P>
        <H>6. Client Responsibilities</H>
        <P>You agree to provide accurate business information and to hold the necessary rights to the data you submit. You are responsible for maintaining the confidentiality of your account credentials. Results such as search rankings and visibility depend on third-party platforms and are not guaranteed.</P>
        <H>7. Third-Party Platforms</H>
        <P>The Services interact with third-party directories and platforms (e.g., Google, Apple, Bing). {co} is not responsible for changes, outages, policy decisions, or removals made by those platforms.</P>
        <H>8. Limitation of Liability</H>
        <P>To the maximum extent permitted by law, {co}'s total liability for any claim arising from the Services is limited to the amount you paid in the one (1) month preceding the claim. {co} is not liable for indirect, incidental, or consequential damages.</P>
        <H>9. Suspension and Termination</H>
        <P>{co} may suspend or terminate accounts that violate these terms, misuse the Services, or fail payment. Fees already paid remain non-refundable per Section 5.</P>
        <H>10. Changes to Terms</H>
        <P>{co} may update these terms. Material changes will be communicated by email or in-platform notice. Continued use after changes constitutes acceptance.</P>
        <H>11. Contact</H>
        <P>Questions about these terms: info@naporbit.com.</P>
      </div>):(<div>
        <H>1. Overview</H>
        <P>This Privacy Policy explains how {co} collects, uses, and protects information when you use our Services. We are committed to handling your data responsibly and transparently.</P>
        <H>2. Information We Collect</H>
        <P>Account information (name, business name, email, phone), business listing data you provide (address, categories, website), billing information processed securely by our payment processor, and usage data such as activity logs and platform interactions. We do not store full card numbers on our servers; payment details are handled by Stripe.</P>
        <H>3. How We Use Information</H>
        <P>To deliver the Services (submit and manage listings, monitor consistency), to communicate about your account and subscription, to process payments, to provide support, and to improve the platform.</P>
        <H>4. Data Sharing</H>
        <P>We share your business information with third-party directories and platforms strictly as needed to deliver the Services. We use trusted processors (e.g., Stripe for payments, our hosting and database providers). We do not sell your personal data.</P>
        <H>5. Data Security</H>
        <P>We use industry-standard measures including encryption in transit (HTTPS), access controls and row-level security on our database, hashed credentials, and restricted staff access. No system is perfectly secure, but we work continuously to protect your data.</P>
        <H>6. Data Retention</H>
        <P>We retain account data for as long as your account is active. Deleted items are held in a recoverable state for 30 days, then permanently purged. You may request export or deletion of your data at any time.</P>
        <H>7. Your Rights</H>
        <P>You can access, export, or request deletion of your personal data. Use the "Download my data" option in Billing, or contact us. Depending on your jurisdiction, you may have additional rights under laws such as GDPR.</P>
        <H>8. Cookies and Sessions</H>
        <P>We use essential cookies and local session storage to keep you signed in and operate the platform. We do not use them to sell your data.</P>
        <H>9. Changes</H>
        <P>We may update this policy and will notify you of material changes by email or in-platform notice.</P>
        <H>10. Contact</H>
        <P>Privacy questions or data requests: info@naporbit.com.</P>
      </div>)}
    </Card>
  </div>);
}

export default function ClientDashboard({user:userProp,data,reload,onLogout,impersonating=false,onUserUpdate}){
  const[page,setPage]=useState("home");
  const[toast,Toasts]=useToast();
  const[showManual,setShowManual]=useState(false);
  const[confirm,setConfirm]=useState(null);
  const[stripeConfigured,setStripeConfigured]=useState(null); // null=loading, true/false
  const[invoices,setInvoices]=useState([]);
  const[sysNotifs,setSysNotifs]=useState([]);
  const[notifOpen,setNotifOpen]=useState(false);
  const[chatUnread,setChatUnread]=useState(0);
  const notifSig=useRef("");
  const billingSyncedFor=useRef(null);
  const w=useWindowSize();const isMobile=w<820;
  // Async action runner: run fn, optionally toast, then refresh data. Used by billing actions.
  // Returns true on success, false on failure (and toasts the error).
  const R=async(fn,msg)=>{try{await fn();if(msg)toast(msg);await reload();return true;}catch(e){toast(e.message||"Something went wrong","info");return false;}};
  // Always use the freshest copy of the profile (data.users is refreshed by reload()).
  // Safe fallbacks — never crash if a field is briefly missing during load.
  const user=(data?.users||[]).find(u=>u.id===userProp?.id)||userProp||{};
  const userId=user.id||userProp?.id||null;
  // Resume plan intent from landing (?plan= or sessionStorage) and checkout return (?billing=success).
  useEffect(()=>{
    if(impersonating||!userId)return;
    let planIntent=null;
    let billingFlag=null;
    try{
      const sp=new URLSearchParams(window.location.search);
      planIntent=sp.get("plan");
      billingFlag=sp.get("billing");
      if(!planIntent)planIntent=sessionStorage.getItem("ro_pending_plan");
      if(planIntent&&["essentials","growth","gmb"].includes(planIntent)){
        setPage("billing");
        // Consume once so remounts don't keep forcing Billing.
        if(!billingFlag){try{sessionStorage.removeItem("ro_pending_plan");}catch{}}
      }
      if(billingFlag==="success"){
        setPage("billing");
        toast("Payment received — your plan will activate in a moment","success");
        try{sessionStorage.removeItem("ro_pending_plan");}catch{}
        reload();
      }else if(billingFlag==="cancel"){
        setPage("billing");
        toast("Checkout canceled — pick a plan whenever you're ready","info");
      }else if(billingFlag==="portal"){
        setPage("billing");
        reload();
      }
      if(planIntent||billingFlag){
        const url=new URL(window.location.href);
        url.searchParams.delete("plan");
        url.searchParams.delete("billing");
        window.history.replaceState(null,"",url.pathname+(url.search||""));
      }
    }catch{}
  },[userId,impersonating]); // eslint-disable-line react-hooks/exhaustive-deps
  // Detect whether Stripe Checkout is configured (server env).
  useEffect(()=>{(async()=>{const s=await api.billingStatus();setStripeConfigured(!!s.configured);})();},[]);
  // Load invoices + refresh Stripe period once per visit to Billing (avoids reload loops / flicker).
  useEffect(()=>{
    if(page!=="billing"||!userId||impersonating){
      if(page!=="billing")billingSyncedFor.current=null;
      return;
    }
    if(billingSyncedFor.current===userId)return;
    billingSyncedFor.current=userId;
    let cancelled=false;
    (async()=>{
      const synced=await api.syncInvoices();
      if(cancelled)return;
      if(synced.invoices?.length)setInvoices(synced.invoices);
      else{
        const rows=await api.listInvoices(userId);
        if(!cancelled)setInvoices(rows||[]);
      }
      const p=synced.profile;
      if(!cancelled&&p&&(
        p.plan!==user.plan||
        p.subscriptionStatus!==user.subscriptionStatus||
        p.currentPeriodEnd!==user.currentPeriodEnd||
        !!p.cancelAtPeriodEnd!==!!user.cancelAtPeriodEnd
      ))await reload();
    })();
    return()=>{cancelled=true;};
  },[page,userId,impersonating]); // eslint-disable-line react-hooks/exhaustive-deps
  // First-login user manual: show once. Never auto-open while staff is impersonating.
  useEffect(()=>{
    if(impersonating||!userId)return;
    try{const key="ro_manual_seen_"+userId;if(!localStorage.getItem(key)){setShowManual(true);localStorage.setItem(key,"1");}}catch{}
  },[userId,impersonating]);
  useEffect(()=>{
    if(!userId)return;
    let cancelled=false;
    const pull=async()=>{
      const rows=await api.listMyNotifications();
      if(cancelled)return;
      const next=rows||[];
      const sig=next.map(n=>`${n.id}:${n.read?1:0}`).join("|");
      if(sig===notifSig.current)return;
      notifSig.current=sig;
      setSysNotifs(next);
    };
    pull();
    const t=setInterval(pull,30000);
    return()=>{cancelled=true;clearInterval(t);};
  },[userId]);

  // Chat unread badge — poll while not on Messages; don't rebind on every page change.
  const pageRef=useRef(page);
  pageRef.current=page;
  useEffect(()=>{
    if(impersonating||!userId)return;
    let cancelled=false;
    const pull=async()=>{
      if(pageRef.current==="messages")return;
      const r=await api.listChatMessages({limit:40});
      if(cancelled||r.error)return;
      setChatUnread(r.unread||0);
    };
    pull();
    const t=setInterval(pull,20000);
    const unsub=api.subscribeChat(userId,{
      onInsert:(row)=>{
        if(pageRef.current==="messages")return;
        if(row.senderId&&row.senderId!==userId)setChatUnread(n=>n+1);
      },
    });
    return()=>{cancelled=true;clearInterval(t);unsub();};
  },[userId,impersonating]);

  if(!data||!userId){
    return(<div style={{padding:40,textAlign:"center",color:T.sub,fontFamily:FONT_B}}>Loading your dashboard…</div>);
  }
  const my=(data.listings&&data.listings[userId])||[];
  const myGmb=(data.gmb&&data.gmb[userId])||null;
  const myAnalytics=(data.analytics&&data.analytics[userId])||null;
  const myAct=(Array.isArray(data.activity)?data.activity:[]).filter(a=>a.clientId===userId);
  const settings=data.settings||{};
  const cfg=settings?.config||{};
  // Client-visible prices honor the super-admin control-panel overrides, falling back to defaults.
  const priceOf=(id)=>{const m={essentials:"priceEssentials",growth:"priceGrowth",gmb:"priceGmb"};const v=cfg[m[id]];return v!=null&&v!==""?Number(v):PLANS[id]?.price;};
  // Full map (all plans, for looking up a client's current plan even if now hidden).
  const PLANSALL=Object.fromEntries(Object.entries(PLANS).map(([id,p])=>[id,{...p,price:priceOf(id)}]));
  // Selectable map: only live plans show in the choose/upgrade grid.
  const PLANSV=Object.fromEntries(Object.entries(PLANS).filter(([id])=>planLive(id,cfg)).map(([id,p])=>[id,{...p,price:priceOf(id)}]));
  const live=my.filter(l=>l.status==="live").length;
  const pending=my.filter(l=>l.status==="pending").length;
  const plan=PLANSALL[user.plan]||PLANSALL.essentials;
  const hour=new Date().getHours();
  const greet=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const nav=[
    {id:"home",icon:"🏠",label:"Home"},
    {id:"notifications",icon:"🔔",label:"Notifications"},
    {id:"messages",icon:"💬",label:"Messages"},
    {id:"listings",icon:"📋",label:"Listings"},
    {id:"analytics",icon:"📈",label:"Analytics"},
    ...(user.plan==="gmb"?[{id:"gmb",icon:"📍",label:"GMB"}]:[]),
    {id:"billing",icon:"💳",label:"Plan & Billing"},
    {id:"call",icon:"📞",label:"Book a Call"},
  ];
  const growthData=buildLiveGrowthSeries(my,5);
  const liveMomTrend=growthMomTrend(growthData);
  const planBadge=user.plan?(<div style={{marginTop:14,padding:"10px 13px",background:plan.soft,borderRadius:13}}>
    <div style={{fontSize:10,color:T.sub,fontWeight:800,letterSpacing:".5px"}}>YOUR PLAN</div>
    <div style={{fontSize:14,fontWeight:800,color:plan.color,marginTop:2,fontFamily:FONT_D}}>{plan.name} · ${plan.price}/mo</div>
    <div style={{fontSize:10.5,color:T.sub,marginTop:2}}>{plan.quota}</div>
  </div>):(<div style={{marginTop:14,padding:"10px 13px",background:T.amberSoft,borderRadius:13}}>
    <div style={{fontSize:10,color:T.amber,fontWeight:800,letterSpacing:".5px"}}>NO PLAN YET</div>
    <div style={{fontSize:12,color:T.sub,marginTop:3}}>Pick a plan on the Billing page to get started.</div>
  </div>);

  // Single headline metric: blends coverage, NAP consistency, and live ratio into one 0-100 score.
  const visScore=(()=>{
    const coverage=Math.min(100,(live/60)*100);
    const nap=user.napScore||0;
    const liveRatio=my.length?(live/my.length)*100:0;
    return Math.round(coverage*0.4+nap*0.4+liveRatio*0.2);
  })();
  const visLabel=visScore>=75?"Excellent":visScore>=50?"Good":visScore>=25?"Building":"Getting started";
  const visColor=visScore>=75?T.green:visScore>=50?T.brand:visScore>=25?T.amber:T.faint;
  // Home plan card: only show renew date from Stripe-synced currentPeriodEnd (no invented +1 month).
  const homePeriodEnd=(()=>{
    if(!user.currentPeriodEnd)return{label:null,daysLeft:null,daysLeftLabel:null,pending:!!user.plan};
    const end=new Date(user.currentPeriodEnd);
    if(Number.isNaN(end.getTime()))return{label:null,daysLeft:null,daysLeftLabel:null,pending:!!user.plan};
    const start=new Date();start.setHours(0,0,0,0);
    const endDay=new Date(end);endDay.setHours(0,0,0,0);
    const daysLeft=Math.max(0,Math.round((endDay-start)/86400000));
    return{
      label:end.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
      daysLeft,
      daysLeftLabel:daysLeft===0?"Ends today":daysLeft===1?"1 day left":`${daysLeft} days left`,
      pending:false,
    };
  })();

  const liveNotifs=sysNotifs.filter(n=>!isPastMeetingNotif(n));
  const recentAct=myAct.slice(0,6);
  const recentNotifs=liveNotifs.slice(0,12).map(n=>({
    id:n.id,
    kind:"sys",
    type:n.type,
    title:n.title,
    desc:n.body||n.title,
    date:n.createdAt?new Date(n.createdAt).toLocaleString():"",
    read:!!n.read,
  }));
  const unreadSys=liveNotifs.filter(n=>!n.read).length;
  const markAllRead=async()=>{
    const ids=liveNotifs.filter(n=>!n.read).map(n=>n.id);
    if(!ids.length)return;
    await api.markNotificationsRead(ids);
    setSysNotifs(prev=>prev.map(n=>({...n,read:true})));
  };
  const markOneRead=async(id)=>{
    const row=sysNotifs.find(n=>n.id===id);
    if(!row||row.read)return;
    await api.markNotificationsRead([id]);
    setSysNotifs(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));
  };
  const notifTarget=(t)=>({
    listing_live:"listings",nap_fix:"listings",edit_blocked:"listings",flagged:"listings",rejected:"listings",submitted:"listings",
    gmb_update:"gmb",analytics:"analytics",
    meeting_confirmed:"call",meeting_cancelled:"call",meeting_pending:"call",call_booked:"call",
    bdm_assigned:"call",message_sent:"messages",bdm_message:"messages",chat_message:"messages",
    plan_subscribed:"billing",plan_changed:"billing",plan_cancel_scheduled:"billing",plan_cancelled:"billing",
    plan_resumed:"billing",payment_failed:"billing",invoice_paid:"billing",welcome:"home",
  }[t]||"home");
  const notifIcon=(t)=>({
    meeting_confirmed:"✅",meeting_cancelled:"❌",meeting_pending:"📅",call_booked:"📅",
    bdm_assigned:"👤",message_sent:"💬",bdm_message:"💬",chat_message:"💬",
    plan_subscribed:"💳",plan_changed:"🔄",plan_cancel_scheduled:"⛔",plan_cancelled:"⛔",
    plan_resumed:"✅",payment_failed:"⚠️",invoice_paid:"🧾",welcome:"👋",
    listing_live:"🟢",rejected:"❌",flagged:"🚩",nap_fix:"🔧",
  }[t]||"🔔");
  const openNotif=async(a)=>{
    setNotifOpen(false);
    if(a.kind==="sys")await markOneRead(a.id);
    setPage(notifTarget(a.type));
  };
  const NotifBell=()=>(
    <div style={{position:"relative"}}>
      <button onClick={()=>{setNotifOpen(o=>!o);}} aria-label="Notifications" style={{position:"relative",width:42,height:42,borderRadius:12,background:notifOpen?T.brandSoft:T.surface,border:`1.5px solid ${notifOpen?T.brand:T.line}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={notifOpen?T.brand:T.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unreadSys>0&&<span style={{position:"absolute",top:-3,right:-3,background:T.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,minWidth:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:"2px solid #fff"}}>{unreadSys}</span>}
      </button>
      {notifOpen&&(<><div style={{position:"fixed",inset:0,zIndex:80}} onClick={()=>setNotifOpen(false)}/>
        <div className="pop" style={{position:"absolute",top:50,right:0,width:isMobile?280:340,background:T.surface,borderRadius:16,boxShadow:SHADOW_LG,border:`1px solid ${T.line}`,zIndex:90,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>Notifications</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {unreadSys>0&&<button onClick={markAllRead} style={{background:"none",border:"none",color:T.brand,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>Mark all read</button>}
              <button onClick={()=>{setNotifOpen(false);setPage("notifications");}} style={{background:"none",border:"none",color:T.sub,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>View all</button>
            </div>
          </div>
          <div style={{maxHeight:360,overflowY:"auto"}}>
            {recentNotifs.length===0?<div style={{padding:"26px 16px",textAlign:"center",fontSize:13,color:T.faint}}>You're all caught up.</div>:
              recentNotifs.map(a=>(<div key={a.id} onClick={()=>openNotif(a)} className="hoverRow" style={{display:"flex",gap:11,padding:"13px 16px",borderBottom:`1px solid ${T.line}`,alignItems:"flex-start",cursor:"pointer",opacity:a.read?0.9:1,background:a.read?"transparent":T.brandSoft}}>
                <span style={{fontSize:16,marginTop:1}}>{notifIcon(a.type)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:a.read?600:800,lineHeight:1.45,color:T.ink}}>{a.title}</div>
                  {a.desc&&a.desc!==a.title&&<div style={{fontSize:12,color:T.sub,marginTop:3,lineHeight:1.4}}>{a.desc}</div>}
                  <div style={{fontSize:11,color:T.faint,marginTop:4}}>{a.date}</div>
                </div>
                {!a.read&&<span style={{width:8,height:8,borderRadius:"50%",background:T.brand,flexShrink:0,marginTop:6}}/>}
              </div>))}
          </div>
        </div></>)}
    </div>
  );

  const NotificationsPage=()=>(
    <div>
      <PageHead isMobile={isMobile} title="Notifications" sub="Meeting updates, BDM messages, and account alerts"
        right={unreadSys>0?<Btn variant="soft" size="sm" onClick={markAllRead}>Mark all read</Btn>:null}/>
      <Card>
        {liveNotifs.length===0?(
          <Empty icon="📭" title="No notifications yet" sub="When your BDM confirms a meeting or updates your account, it shows up here."/>
        ):(
          <div>
            {liveNotifs.map((n,i)=>(
              <div key={n.id} onClick={async()=>{await markOneRead(n.id);setPage(notifTarget(n.type));}}
                style={{display:"flex",gap:12,padding:"14px 6px",borderBottom:i<liveNotifs.length-1?`1px solid ${T.line}`:"none",cursor:"pointer",opacity:n.read?0.9:1}}>
                <div style={{width:36,height:36,borderRadius:10,background:n.read?T.surface2:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{notifIcon(n.type)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
                    <div style={{fontSize:13.5,fontWeight:n.read?600:800,color:T.ink}}>{n.title}</div>
                    {!n.read&&<span style={{width:8,height:8,borderRadius:"50%",background:T.brand,flexShrink:0,marginTop:5}}/>}
                  </div>
                  {n.body&&<div style={{fontSize:12.5,color:T.sub,marginTop:4,lineHeight:1.45}}>{n.body}</div>}
                  <div style={{fontSize:11,color:T.faint,marginTop:5}}>{n.createdAt?new Date(n.createdAt).toLocaleString():""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const Home=()=>(<div>
    {!user.plan&&(<Card style={{marginBottom:18,background:`linear-gradient(135deg,${T.brandSoft},#fff)`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>Welcome to NAP Orbit 🚀</div><div style={{fontSize:13,color:T.sub,marginTop:3}}>Choose a plan to start getting listed, or your account manager will set you up after your call.</div></div>
      <Btn onClick={()=>setPage("billing")}>Choose a plan</Btn>
    </Card>)}
    {/* Visibility Score + current plan / billing summary */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.3fr 1fr",gap:16,marginBottom:22}}>
      <Card style={{background:`linear-gradient(135deg,${visColor}18,#fff)`,display:"flex",alignItems:"center",gap:22,flexWrap:"wrap"}}>
        <div style={{position:"relative",width:118,height:118,flexShrink:0}}>
          <svg width="118" height="118" viewBox="0 0 118 118">
            <circle cx="59" cy="59" r="50" fill="none" stroke={T.line} strokeWidth="11"/>
            <circle cx="59" cy="59" r="50" fill="none" stroke={visColor} strokeWidth="11" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*50}`} strokeDashoffset={`${2*Math.PI*50*(1-visScore/100)}`}
              transform="rotate(-90 59 59)" style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.22,.8,.36,1)"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:visColor,lineHeight:1}}>{visScore}</div>
            <div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>/ 100</div>
          </div>
        </div>
        <div style={{flex:1,minWidth:150}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:5}}>YOUR VISIBILITY SCORE</div>
          <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:visColor,marginBottom:6}}>{visLabel}</div>
          <div style={{fontSize:12.5,color:T.sub,lineHeight:1.55}}>One number for your online health, it blends how many directories you're on, how consistent your info is, and how many listings are live. It climbs as we work.</div>
        </div>
      </Card>
      <Card style={{background:user.cancelAtPeriodEnd?`linear-gradient(135deg,${T.amberSoft},#fff)`:`linear-gradient(135deg,${plan.soft||T.brandSoft},#fff)`,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        {user.plan?(<>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>CURRENT PLAN</div>
          <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:plan.color,marginBottom:4}}>{plan.name}</div>
          <div style={{fontSize:14,color:T.sub,marginBottom:12}}>${plan.price}<span style={{color:T.faint}}>/month</span>
            {user.cancelAtPeriodEnd&&<span style={{marginLeft:8,fontSize:12,fontWeight:700,color:T.amber}}>Cancels on renewal</span>}
          </div>
          {homePeriodEnd.daysLeftLabel?(
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:user.cancelAtPeriodEnd?T.amberSoft:T.brandSoft,borderRadius:10,alignSelf:"flex-start",marginBottom:14}}>
              <span style={{fontSize:12,fontWeight:800,color:user.cancelAtPeriodEnd?T.amber:T.brand}}>{homePeriodEnd.daysLeftLabel}</span>
              <span style={{fontSize:11.5,color:T.sub}}>renews {homePeriodEnd.label}</span>
            </div>
          ):homePeriodEnd.pending?(
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:T.surface2,borderRadius:10,alignSelf:"flex-start",marginBottom:14}}>
              <span style={{fontSize:12,fontWeight:700,color:T.sub}}>Renewal date syncing from Stripe…</span>
            </div>
          ):null}
          <Btn variant="soft" size="sm" onClick={()=>setPage("billing")} style={{alignSelf:"flex-start"}}>Manage billing →</Btn>
        </>):(<>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>YOUR PLAN</div>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:6}}>No plan yet</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:14,lineHeight:1.5}}>Pick a plan to start getting listed and protected across directories.</div>
          <Btn size="sm" onClick={()=>setPage("billing")} style={{alignSelf:"flex-start"}}>Choose a plan →</Btn>
        </>)}
      </Card>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22}}>
      <StatCard label="Listings Live" value={live} sub={`${pending} pending approval`} icon={<ListingsLiveIcon/>} color={T.green} soft={T.greenSoft} trend={liveMomTrend} delay={0}/>
      <StatCard label="NAP Score" value={`${user.napScore||0}%`} sub="Info matches everywhere" icon={<NapScoreIcon/>} delay={80}/>
      <StatCard label="Edits Blocked" value={myAct.filter(a=>a.type==="edit_blocked").length} sub="Unauthorized changes reverted" icon={<EditsBlockedIcon/>} color={T.amber} soft={T.amberSoft} delay={160}/>
      <StatCard label="Directories" value={my.length} sub="Managed for you" icon={<DirectoriesIcon/>} color={T.blue} soft={T.blueSoft} delay={240}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.7fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <SectionTitle sub="Cumulative live listings by go-live date">Your Visibility Is Growing</SectionTitle>
        <div style={{width:"100%",height:200,minWidth:0}}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <AreaChart data={growthData}>
            <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.28}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={28}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="live" name="Live listings" stroke={T.green} strokeWidth={2.5} fill="url(#lg)" dot={{fill:T.green,r:4,strokeWidth:2,stroke:"#fff"}} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <SectionTitle sub="of 60 target directories">Coverage Progress</SectionTitle>
        <div style={{display:"flex",justifyContent:"center",margin:"6px 0 14px"}}>
          <div style={{position:"relative",width:150,height:150,minWidth:150}}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <PieChart><Pie data={[{v:live},{v:pending},{v:Math.max(0,60-live-pending)}]} cx="50%" cy="50%" innerRadius={52} outerRadius={70} dataKey="v" strokeWidth={0} startAngle={90} endAngle={-270} isAnimationActive={false}>
                <Cell fill={T.green}/><Cell fill={T.amber}/><Cell fill={T.line}/>
              </Pie></PieChart>
            </ResponsiveContainer>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800}}>{Math.round(live/60*100)}%</div>
              <div style={{fontSize:10.5,color:T.faint}}>covered</div>
            </div>
          </div>
        </div>
        {[{l:"Live",c:T.green,v:live},{l:"Pending",c:T.amber,v:pending},{l:"Upcoming",c:T.faint,v:Math.max(0,60-live-pending)}].map(d=>(
          <div key={d.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:3,background:d.c}}/><span style={{fontSize:12.5,color:T.sub}}>{d.l}</span></div>
            <span style={{fontSize:13,fontWeight:800,color:d.c===T.faint?T.sub:d.c}}>{d.v}</span>
          </div>))}
      </Card>
    </div>
    <Card>
      <SectionTitle sub="Every action we take on your account, logged with dates">Recent Activity</SectionTitle>
      {myAct.length===0?<Empty icon="🛰️" title="Work starting" sub="Your first listings are being prepared, check back soon."/>:
        myAct.slice(0,5).map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<Math.min(myAct.length,5)-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
          <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
          <div><div style={{fontSize:13.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{a.date}{a.by?` · ${clientBy(a.by)}`:""}</div></div>
        </div>))}
    </Card>
  </div>);

  const Listings=()=>(<div>
    <PageHead isMobile={isMobile} title="Listings & Citations" sub={`${plan.quota} on your ${plan.name} plan`}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
      <StatCard label="Live" value={live} icon={<ListingsLiveIcon/>} color={T.green} soft={T.greenSoft} delay={0}/>
      <StatCard label="Pending" value={pending} icon={<PendingIcon/>} color={T.amber} soft={T.amberSoft} delay={70}/>
      <StatCard label="NAP Score" value={`${user.napScore||0}%`} icon={<NapScoreIcon/>} delay={140}/>
      <StatCard label="Protected" value={my.length} sub="Monitored 24/7" icon={<EditsBlockedIcon/>} color={T.blue} soft={T.blueSoft} delay={210}/>
    </div>
    <Card style={{overflowX:"auto",padding:isMobile?14:22}}>
      <SectionTitle>Your Directories</SectionTitle>
      {my.length===0?<Empty icon="📋" title="No listings yet" sub="Your directory submissions will appear here once your plan is active."/>:
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}>
        <thead><tr>{["Directory","Status","Authority","Live Since","Info Match","Link"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
        <tbody>{my.map((d)=>(<tr key={d.id} className="hoverRow">
          <td style={{padding:"12px",fontSize:13.5,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:44,height:5,background:T.surface2,borderRadius:3,overflow:"hidden"}}><div style={{width:`${d.da}%`,height:"100%",background:d.da>=80?T.green:d.da>=60?T.amber:T.faint,borderRadius:3,animation:"growBar .9s ease both"}}/></div>
              <span style={{fontSize:12,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub}}>{d.da}</span>
            </div>
          </td>
          <td style={{padding:"12px",fontSize:12.5,color:d.liveDate==="–"?T.faint:T.ink,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="–"?<span style={{fontSize:12,color:T.faint}}>–</span>:<Badge type={d.napMatch}/>}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12.5,fontWeight:700,textDecoration:"none"}}>View ↗</a>:<span style={{color:T.faint,fontSize:12}}>–</span>}</td>
        </tr>))}</tbody>
      </table>}
    </Card>
  </div>);

  const Analytics=()=>{
    const a=myAnalytics;
    if(!a||!a.trend?.length)return(<div>
      <PageHead isMobile={isMobile} title="Website Analytics" sub="Traffic and engagement from your website"/>
      <Card><Empty icon="📈" title="Analytics not connected yet" sub="Your account manager will connect Google Analytics or add your numbers soon."/></Card>
    </div>);
    return(<div>
      <PageHead isMobile={isMobile} title="Website Analytics" sub="Traffic and engagement from your website" right={<Badge type={a.source==="connected"?"connected":"manual"}/>}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Sessions" value={a.sessions||0} icon="👣" color={T.green} soft={T.greenSoft} delay={0}/>
        <StatCard label="Users" value={a.users||0} icon="👤" delay={70}/>
        <StatCard label="Page Views" value={a.pageviews||0} icon="📄" color={T.blue} soft={T.blueSoft} delay={140}/>
        <StatCard label="Avg. Time" value={a.avgTime||"0:00"} icon="⏱️" color={T.violet} soft={T.violetSoft} delay={210}/>
      </div>
      <Card><SectionTitle sub="Monthly website sessions & users">Traffic Trend</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={a.trend}>
            <defs><linearGradient id="as" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.brand} stopOpacity={.25}/><stop offset="100%" stopColor={T.brand} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={34}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="s" name="Sessions" stroke={T.brand} strokeWidth={2.5} fill="url(#as)" dot={false} animationDuration={1100}/>
            <Area type="monotone" dataKey="u" name="Users" stroke={T.green} strokeWidth={2} fill="none" dot={false} animationDuration={1300}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>);
  };

  const Gmb=()=>{
    if(user.plan!=="gmb")return(<div>
      <PageHead isMobile={isMobile} title="GMB Management"/>
      <Card style={{textAlign:"center",padding:isMobile?32:56,boxShadow:SHADOW_LG}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><Orbit size={100} speed={10}/></div>
        <div style={{fontFamily:FONT_D,fontSize:21,fontWeight:800,marginBottom:8}}>Put your Google profile on autopilot</div>
        <div style={{fontSize:13.5,color:T.sub,maxWidth:440,margin:"0 auto 24px",lineHeight:1.6}}>We publish posts, answer Q&A, keep your profile complete, and get you found in AI searches like ChatGPT, Gemini and Google AI Overviews, plus show you exactly how many calls and visits Google sends you every month.</div>
        <Btn size="lg" onClick={()=>setPage("billing")}>Upgrade to GMB Pro, $249/mo</Btn>
        <div style={{fontSize:11.5,color:T.faint,marginTop:12}}>Includes everything in Growth · Cancel anytime</div>
      </Card>
    </div>);
    const d=myGmb||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],completeness:{}};
    const fromGoogle=d.source==="google"||d.source==="connected";
    const lastSync=d.syncedAt?(()=>{try{return new Date(d.syncedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}catch{return d.syncedAt;}})():null;
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub={fromGoogle&&lastSync?`Last synced ${lastSync}`:"Your Google Business Profile, actively managed"} right={<Badge type={fromGoogle?"connected":"manual"} label={fromGoogle?"Synced from Google":undefined}/>}/>
      {fromGoogle&&(
        <div style={{padding:"10px 14px",background:T.greenSoft,borderRadius:12,marginBottom:14,fontSize:12.5,color:T.green,lineHeight:1.5}}>
          Metrics pull automatically from your Google Business Profile{lastSync?` · Last sync ${lastSync}`:""}.
        </div>
      )}
      <Card style={{marginBottom:16,background:`linear-gradient(135deg,${T.violetSoft},#fff)`,display:"flex",gap:14,alignItems:"center"}}>
        <div style={{width:44,height:44,borderRadius:13,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:SHADOW}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.violet} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        </div>
        <div><div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D}}>Now visible in AI searches</div><div style={{fontSize:12.5,color:T.sub,lineHeight:1.5,marginTop:2}}>Your managed profile and consistent data help you appear in ChatGPT, Gemini and Google AI Overviews, not just traditional search.</div></div>
      </Card>
      <ReportCard user={user} reload={reload} toast={toast}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Profile Views" value={d.views} icon="👁️" color={T.green} soft={T.greenSoft} trend={18} delay={0}/>
        <StatCard label="Calls From Google" value={d.calls} icon="📞" trend={12} delay={80}/>
        <StatCard label="Direction Requests" value={d.directions} icon="🗺️" color={T.blue} soft={T.blueSoft} trend={9} delay={160}/>
      </div>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Real customer engagement from your Google profile">Engagement Trend</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={d.trend}>
            <defs>
              <linearGradient id="gv2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.22}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="gc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.brand} stopOpacity={.2}/><stop offset="100%" stopColor={T.brand} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={34}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="v" name="Views" stroke={T.green} strokeWidth={2.5} fill="url(#gv2)" dot={false} animationDuration={1100}/>
            <Area type="monotone" dataKey="c" name="Calls" stroke={T.brand} strokeWidth={2.5} fill="url(#gc2)" dot={false} animationDuration={1300}/>
            <Area type="monotone" dataKey="d" name="Directions" stroke={T.blue} strokeWidth={2} fill="none" dot={false} animationDuration={1500}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Google Business Profile posts we publish to keep your listing active and engaging" right={<span style={{fontSize:11.5,fontWeight:800,color:T.violet,background:T.violetSoft,padding:"4px 11px",borderRadius:20}}>{(d.posts||[]).length} posts</span>}>GMB Posts</SectionTitle>
        {(!d.posts||d.posts.length===0)?<Empty icon="📝" title="No posts yet" sub="Your first GMB post is being drafted by your account manager."/>:
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
            {d.posts.map((p,i)=>{
              const typeInfo={offer:{c:T.amber,cs:T.amberSoft,ic:"🎁",label:"Offer"},event:{c:T.violet,cs:T.violetSoft,ic:"📅",label:"Event"},update:{c:T.brand,cs:T.brandSoft,ic:"📢",label:"Update"},product:{c:T.green,cs:T.greenSoft,ic:"🛍️",label:"Product"}}[p.type||"update"];
              const scheduled=p.status==="scheduled";
              return(<div key={i} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,padding:16,position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:800,color:typeInfo.c,background:typeInfo.cs,padding:"3px 9px",borderRadius:20}}>{typeInfo.ic} {typeInfo.label}</span>
                  <span style={{fontSize:10.5,fontWeight:800,color:scheduled?T.amber:T.green,background:scheduled?T.amberSoft:T.greenSoft,padding:"3px 9px",borderRadius:20}}>{scheduled?"◷ Scheduled":"● Live"}</span>
                </div>
                <div style={{fontSize:14,fontWeight:800,marginBottom:5}}>{p.title}</div>
                {p.content&&<div style={{fontSize:12.5,color:T.sub,lineHeight:1.5,marginBottom:8}}>{p.content}</div>}
                <div style={{fontSize:11,color:T.faint}}>{scheduled?"Scheduled for":"Published"} {p.date}</div>
              </div>);
            })}
          </div>}
      </Card>
      <Card><SectionTitle>Profile Completeness</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"2px 24px"}}>
          {Object.entries(d.completeness||{}).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={{fontSize:13,color:T.sub,textTransform:"capitalize"}}>{k}</span>
            <span style={{fontSize:12.5,fontWeight:800,color:v?T.green:T.amber}}>{v?"✓ Done":"○ In progress"}</span>
          </div>))}
        </div>
      </Card>
    </div>);
  };

  const Billing=()=>{
    // Paid plans only — Stripe Checkout / change-subscription. No free activate path.
    const stripeReady=stripeConfigured===true;
    const billingBlocked=stripeConfigured===false;
    const goStripe=async(planId)=>{
      try{sessionStorage.setItem("ro_pending_plan",planId);}catch{}
      if(billingBlocked){
        toast("Billing is not connected yet. Checkout opens once Stripe is configured.","info");
        return;
      }
      if(stripeConfigured!==true){
        toast("Checking billing setup…","info");
        return;
      }
      // Existing Stripe subscription → change plan in place; otherwise Checkout Session.
      if(user.stripeSubscriptionId){
        const r=await api.changeSubscription(planId);
        if(r.error){toast(r.error,"info");return;}
        try{sessionStorage.removeItem("ro_pending_plan");}catch{}
        await R(async()=>{},`Switched to ${PLANS[planId].name}`);
        return;
      }
      const r=await api.createCheckout(planId);
      if(r.error){toast(r.error,"info");return;}
      if(r.url)window.location.href=r.url;
    };
    const doCancel=async()=>{
      if(api.mode!=="supabase"){
        const ok=await R(async()=>{
          await api.patchProfile(user.id,{cancelAtPeriodEnd:true,canceledAt:new Date().toISOString()});
        },"Subscription set to cancel at period end");
        if(!ok)throw new Error("Cancel failed");
        return;
      }
      const r=await api.cancelSubscription({resume:false});
      if(r.error){toast(r.error,"info");throw new Error(r.error);}
      toast("Subscription set to cancel at period end");
      await reload();
    };
    const doResume=async()=>{
      if(api.mode!=="supabase"){
        const ok=await R(async()=>{
          await api.patchProfile(user.id,{cancelAtPeriodEnd:false,canceledAt:null});
        },"Subscription resumed, you're all set");
        if(!ok)throw new Error("Resume failed");
        return;
      }
      const r=await api.cancelSubscription({resume:true});
      if(r.error){toast(r.error,"info");throw new Error(r.error);}
      toast("Subscription resumed, you're all set");
      await reload();
    };
    const openPortal=async()=>{
      if(!stripeReady){toast("Card management opens in Stripe once billing is connected","info");return;}
      const r=await api.createPortalSession();
      if(r.error){toast(r.error,"info");return;}
      if(r.url)window.location.href=r.url;
    };
    // Only Stripe-synced currentPeriodEnd — never invent +1 month.
    const periodEndDate=user.currentPeriodEnd?new Date(user.currentPeriodEnd):null;
    const periodSynced=!!(periodEndDate&&!Number.isNaN(periodEndDate.getTime()));
    const periodLabel=periodSynced
      ?periodEndDate.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
      :"the end of your billing period";
    const nextChargeLabel=periodSynced
      ?periodEndDate.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
      :"Renewal date syncing from Stripe…";
    const daysLeft=(()=>{
      if(!periodSynced)return null;
      const start=new Date();start.setHours(0,0,0,0);
      const end=new Date(periodEndDate);end.setHours(0,0,0,0);
      return Math.max(0,Math.round((end-start)/86400000));
    })();
    const daysLeftLabel=daysLeft==null?null:daysLeft===0?"Ends today":daysLeft===1?"1 day left":`${daysLeft} days left`;
    // Require core business details before a plan can be selected (captures data upfront, esp. Google signups).
    const profileComplete=!!(user.businessName&&user.phone&&user.address&&user.city&&user.state&&user.category);
    const invoiceRows=invoices.length?invoices:null;
    return(<div>
      <PageHead isMobile={isMobile} title="Plan & Billing" sub="Everything about what you pay and what you get"/>
      {!profileComplete&&!user.plan&&<ProfileGate user={user} onSaved={reload} toast={toast} isMobile={isMobile}/>}
      {(profileComplete||user.plan)&&(<>
      {user.plan&&(<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:16,marginBottom:20}}>
        <Card className="fadeUp" style={{position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:plan.soft,opacity:.6}}/>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>CURRENT PLAN</div>
          <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
            <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800}}>{plan.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:plan.color}}>${plan.price}<span style={{fontSize:13,color:T.faint,fontWeight:600}}>/month</span></div>
            <Badge type={user.subscriptionStatus==="past_due"?"pending":"active"}/>
          </div>
          <div style={{marginTop:16}}>
            {plan.features.map((f,i)=>(<div key={i} style={{display:"flex",gap:9,alignItems:"center",marginBottom:8}}>
              <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:800,flexShrink:0}}>✓</div>
              <span style={{fontSize:13,color:T.sub}}>{f}</span>
            </div>))}
          </div>
        </Card>
        <Card className="fadeUp" style={{animationDelay:"100ms",background:user.cancelAtPeriodEnd?`linear-gradient(135deg,${T.amberSoft},#fff)`:`linear-gradient(135deg,${T.brandSoft},#fff)`}}>
          {user.cancelAtPeriodEnd?(<>
            <div style={{fontSize:11,fontWeight:800,color:T.amber,letterSpacing:".8px",marginBottom:8}}>SUBSCRIPTION ENDING</div>
            <div style={{fontFamily:FONT_D,fontSize:19,fontWeight:800,color:T.amber}}>Cancels on renewal</div>
            <div style={{fontSize:13,color:T.sub,marginTop:6,lineHeight:1.5}}>You keep full access until <b>{periodLabel}</b>. You won't be charged again.</div>
            {daysLeftLabel&&(
              <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:T.amberSoft,borderRadius:10}}>
                <span style={{fontSize:12,fontWeight:800,color:T.amber}}>{daysLeftLabel}</span>
                <span style={{fontSize:11.5,color:T.sub}}>in this billing period · ends {periodLabel}</span>
              </div>
            )}
            <Btn variant="green" size="sm" style={{width:"100%",marginTop:12}} onClick={doResume}>Resume subscription</Btn>
          </>):(<>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:8}}>NEXT CHARGE</div>
            <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:800,color:T.brand}}>${plan.price}.00</div>
            <div style={{fontSize:13,color:T.sub,marginTop:3}}>{nextChargeLabel}</div>
            {daysLeftLabel&&(
              <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:T.brandSoft,borderRadius:10}}>
                <span style={{fontSize:12,fontWeight:800,color:T.brand}}>{daysLeftLabel}</span>
                <span style={{fontSize:11.5,color:T.sub}}>in this billing period · renews {periodLabel}</span>
              </div>
            )}
            <div style={{fontSize:11.5,color:T.faint,marginTop:8,lineHeight:1.5}}>Renews automatically. Cancel before your renewal date to avoid the next charge, you keep access until the period ends.</div>
            <button onClick={()=>setConfirm({title:"Cancel subscription?",msg:`Your ${plan.name} plan will stay active until the end of your current billing period, then cancel. You won't be charged again. No refunds for the current period (see Terms).`,danger:true,yes:"Cancel at period end",onYes:doCancel})} style={{marginTop:12,background:"none",border:"none",color:T.faint,fontSize:11.5,fontWeight:700,cursor:"pointer",textDecoration:"underline",fontFamily:FONT_B,padding:0}}>Cancel subscription</button>
          </>)}
        </Card>
      </div>)}
      <SectionTitle sub="Pick a plan to start, or upgrade anytime, secure checkout via Stripe">{user.plan?"Change Plan":"Choose Your Plan"}</SectionTitle>
      {billingBlocked&&<div style={{padding:"10px 14px",background:T.amberSoft,borderRadius:11,marginBottom:14,fontSize:12,color:T.amber,fontWeight:600}}>Checkout is unavailable until Stripe is configured. All plans are paid — there is no free activation.</div>}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>
        {Object.entries(PLANSV).map(([id,p],i)=>{
          const current=id===user.plan;
          return(<div key={id} className="fadeUp hoverCard" style={{animationDelay:`${i*90}ms`,background:T.surface,border:`2px solid ${current?p.color:T.line}`,borderRadius:18,padding:22,position:"relative",boxShadow:current?SHADOW_LG:SHADOW}}>
            {current&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:p.color,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 13px",borderRadius:20,width:"auto",whiteSpace:"nowrap"}}>CURRENT PLAN</div>}
            {id==="growth"&&!current&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 13px",borderRadius:20,width:"auto",whiteSpace:"nowrap"}}>MOST POPULAR</div>}
            <div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>{p.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:30,fontWeight:800,color:p.color,margin:"5px 0 2px"}}>${p.price}<span style={{fontSize:13,color:T.faint,fontWeight:600}}>/mo</span></div>
            <div style={{fontSize:12,color:T.sub,fontWeight:700,marginBottom:14}}>{p.quota}</div>
            <div style={{height:1,background:T.line,marginBottom:14}}/>
            {p.features.map((f,j)=><div key={j} style={{fontSize:12,color:T.sub,marginBottom:8,display:"flex",gap:7}}><span style={{color:T.green,fontWeight:800}}>✓</span>{f}</div>)}
            {current?<Btn variant="ghost" size="sm" style={{width:"100%",marginTop:10}} onClick={()=>toast("This is your active plan")}>Your current plan</Btn>:
              <Btn size="sm" style={{width:"100%",marginTop:10}} disabled={billingBlocked||stripeConfigured===null} onClick={()=>goStripe(id)}>
                {billingBlocked?"Checkout unavailable":`${user.plan?"Switch to ":"Subscribe to "}${p.name} →`}
              </Btn>}
          </div>);
        })}
      </div>
      {user.plan&&(<Card style={{marginTop:20}}>
        <SectionTitle right={<Btn variant="ghost" size="sm" onClick={openPortal}>💳 Manage billing</Btn>}>Invoice History</SectionTitle>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
            <thead><tr>{["Date","Description","Card","Amount","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
            <tbody>
              {invoiceRows?invoiceRows.map(inv=>{
                const dt=inv.createdAt?new Date(inv.createdAt):new Date();
                const amt=((inv.amountCents||0)/100).toFixed(2);
                const last4=user.cardLast4||"••••";
                const paid=inv.status==="paid";
                return(<tr key={inv.id} className="hoverRow">
                  <td style={{padding:"12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{dt.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td>
                  <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{plan.name} plan · monthly</td>
                  <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{user.cardBrand||"Card"} •••• {last4}</td>
                  <td style={{padding:"12px",fontSize:13,fontWeight:800,borderBottom:`1px solid ${T.line}`}}>${amt}</td>
                  <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type={paid?"paid":"pending"}/></td>
                  <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><button onClick={()=>{const u=inv.invoicePdf||inv.hostedInvoiceUrl;if(openExternalFile(u))return;toast("Open Manage billing to view invoices in Stripe","info");}} style={{background:"none",border:"none",color:T.brand,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>PDF ↓</button></td>
                </tr>);
              }):(
                <tr><td colSpan={6} style={{padding:"18px 12px",fontSize:13,color:T.sub}}>No invoices yet. They appear here after your first payment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${T.line}`,fontSize:11.5,color:T.faint,lineHeight:1.5}}>
          Your primary card shows above. Add or remove cards, and download official invoices, in <b>Manage billing</b> (secure Stripe portal). Card details are never stored on our servers.
        </div>
      </Card>)}
      <Card style={{marginTop:16}}>
        <SectionTitle sub="Download everything we hold about your account, profile, listings, and activity.">Your Data</SectionTitle>
        <Btn variant="ghost" size="sm" onClick={()=>{
          try{
            const mine={profile:user,listings:my,activity:myAct,invoices:invoices||[],exportedAt:new Date().toISOString()};
            downloadBlob(JSON.stringify(mine,null,2),`naporbit-my-data-${Date.now()}.json`,"application/json");
            toast("Your data downloaded");
          }catch(e){
            toast(e.message||"Download failed","info");
          }
        }}>⤓ Download my data (JSON)</Btn>
      </Card>
      </>)}
    </div>);
  };

  // IMPORTANT: call page bodies as functions (Home()), not <Home/>.
  // Inner `const Home=()=>` recreated each render would remount the whole page (flicker).
  const homeHeaderLeft=page==="home"?(
    <div style={{minWidth:0}}>
      <div style={{fontFamily:FONT_D,fontSize:isMobile?20:26,fontWeight:800,letterSpacing:"-.6px",lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        {greet}, {(user.name||"there").split(" ")[0]} 👋
      </div>
      <div style={{fontSize:isMobile?12:13.5,color:T.sub,marginTop:2,lineHeight:1.35,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:isMobile?"normal":"nowrap"}}>
        Here's what we're doing for {user.businessName||"your business"} right now
      </div>
    </div>
  ):null;
  const homeHeaderRight=(
    <>
      {page==="home"&&(
        <Btn variant="soft" size="sm" onClick={()=>setPage("call")} style={{whiteSpace:"nowrap"}}>
          📞 Talk to your BDM
        </Btn>
      )}
      {NotifBell()}
    </>
  );
  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={planBadge} showLegalLinks headerLeft={homeHeaderLeft} headerRight={homeHeaderRight} badgeCounts={{notifications:unreadSys,messages:chatUnread}} settingsPageId={impersonating?null:"settings"} contentPadding={page==="legal"?(isMobile?"6px 14px 4px":"8px 34px 4px"):page==="home"?(isMobile?"14px 16px 40px":"20px 34px 50px"):null}>
    {page==="home"&&Home()}
    {page==="notifications"&&NotificationsPage()}
    {page==="messages"&&(
      <div style={{
        height:isMobile?"calc(100dvh - 140px)":"calc(100vh - 100px)",
        display:"flex",
        flexDirection:"column",
        overflow:"hidden",
        margin:isMobile?"-8px 0 -24px":"-18px 0 -40px",
        boxSizing:"border-box",
      }}>
        <div style={{flexShrink:0}}>
          <PageHead isMobile={isMobile} title="Messages" sub="Chat with your Business Development Manager"/>
        </div>
        <div style={{flex:1,minHeight:0,marginTop:-8,overflow:"hidden"}}>
          <ChatThread myId={userId} toast={toast} onUnreadChange={setChatUnread} onOpenCall={()=>setPage("call")} fill/>
        </div>
      </div>
    )}
    {page==="listings"&&Listings()}
    {page==="gmb"&&Gmb()}
    {page==="analytics"&&Analytics()}
    {page==="billing"&&Billing()}
    {page==="call"&&(
      <ClientCallPage user={user} isMobile={isMobile} toast={toast} reload={reload} onOpenMessages={()=>setPage("messages")}/>
    )}
    {page==="settings"&&!impersonating&&(
      <AccountSettings
        user={user}
        toast={toast}
        reload={reload}
        onUserUpdate={onUserUpdate}
        isMobile={isMobile}
      />
    )}
    {page==="legal"&&<ClientLegalPage isMobile={isMobile}/>}
  </Shell>
  {/* Floating Help button, reopens the user manual anytime */}
  <button onClick={()=>setShowManual(true)} title="How to use your dashboard" style={{position:"fixed",bottom:isMobile?18:24,right:isMobile?18:24,zIndex:900,background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",border:"none",borderRadius:isMobile?"50%":24,width:isMobile?52:"auto",height:52,padding:isMobile?0:"0 20px",boxShadow:SHADOW_LG,cursor:"pointer",fontFamily:FONT_B,fontSize:14,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>
    <span style={{fontSize:18}}>?</span>{!isMobile&&<span>Help</span>}
  </button>
  {showManual&&<UserManual user={user} plan={plan} onClose={()=>setShowManual(false)} goTo={(p)=>{setPage(p);setShowManual(false);}}/>}
  {confirm&&<Confirm data={confirm} onClose={()=>setConfirm(null)}/>}
  <Toasts/></>);
}

// First-login user manual + Help-button guide. Explains each section in plain language.
