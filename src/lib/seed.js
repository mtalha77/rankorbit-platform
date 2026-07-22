// ─── DEMO SEED DATA (local fallback mode) ────────────────────────────────────
// Removed at go-live. Used only when Supabase keys are absent (local demo mode).
export const SEED = {
  users:[
    {id:"u1",email:"admin@rankorbit.com",password:"admin123",role:"super_admin",name:"Talha (Admin)",avatar:"T",protected:true},
    {id:"u2",email:"manager@rankorbit.com",password:"manager123",role:"manager",name:"Sara (Manager)",avatar:"S",protected:true},
    {id:"u3",email:"bdm@rankorbit.com",password:"bdm123",role:"bdm",name:"Ali (BDM)",avatar:"A",protected:true,perms:{listings:true,nap:true,logEdit:true,gmb:false}},
    {id:"u3a",email:"agent@rankorbit.com",password:"agent123",role:"agent",name:"Zara (Agent)",avatar:"Z",protected:true,perms:{listings:true,nap:true,logEdit:true,gmb:true}},
    {id:"u4",email:"mike@example.com",password:"client123",role:"client",name:"Mike Johnson",avatar:"M",businessName:"Mike's Plumbing",plan:"growth",phone:"(555) 200-1000",address:"123 Main St",city:"Austin",state:"TX",zip:"78701",website:"mikesplumbing.com",category:"Home Services",status:"active",napScore:94,assignedBdmId:"u3",assignedAgentId:"u3a",protected:true},
    {id:"u5",email:"sarah@dentalcare.com",password:"client123",role:"client",name:"Sarah Miller",avatar:"S",businessName:"Sarah's Dental Care",plan:"gmb",phone:"(555) 300-2000",address:"456 Oak Ave",city:"Houston",state:"TX",zip:"77001",website:"sarahsdental.com",category:"Medical / Health",status:"active",napScore:88,assignedBdmId:"u3",assignedAgentId:"u3a",protected:true},
    {id:"u6",email:"john@autoshop.com",password:"client123",role:"client",name:"John Davis",avatar:"J",businessName:"Davis Auto Repair",plan:"essentials",phone:"(555) 400-3000",address:"789 Elm Rd",city:"Dallas",state:"TX",zip:"75201",website:"davisauto.com",category:"Auto Services",status:"active",napScore:72,protected:true},
  ],
  listings:[
    {id:"l1",clientId:"u4",directory:"Google Business Profile",status:"live",submitted:"Mar 1",liveDate:"Mar 2",napMatch:"match",liveLink:"https://business.google.com",da:99,notes:""},
    {id:"l2",clientId:"u4",directory:"Yellow Pages",status:"live",submitted:"Mar 1",liveDate:"Mar 5",napMatch:"match",liveLink:"https://yellowpages.com",da:92,notes:""},
    {id:"l3",clientId:"u4",directory:"Foursquare",status:"live",submitted:"Mar 2",liveDate:"Mar 6",napMatch:"match",liveLink:"https://foursquare.com",da:88,notes:""},
    {id:"l4",clientId:"u4",directory:"Manta",status:"live",submitted:"Mar 3",liveDate:"Mar 8",napMatch:"match",liveLink:"https://manta.com",da:74,notes:""},
    {id:"l5",clientId:"u4",directory:"MerchantCircle",status:"live",submitted:"Mar 4",liveDate:"Mar 10",napMatch:"fixed",liveLink:"https://merchantcircle.com",da:68,notes:"Phone corrected Jun 24"},
    {id:"l6",clientId:"u4",directory:"Hotfrog",status:"live",submitted:"Apr 1",liveDate:"Apr 4",napMatch:"match",liveLink:"https://hotfrog.com",da:62,notes:""},
    {id:"l7",clientId:"u4",directory:"Storeboard",status:"live",submitted:"Apr 2",liveDate:"Apr 7",napMatch:"match",liveLink:"https://storeboard.com",da:55,notes:""},
    {id:"l8",clientId:"u4",directory:"Proven Expert",status:"live",submitted:"Apr 3",liveDate:"Apr 9",napMatch:"match",liveLink:"https://provenexpert.com",da:58,notes:""},
  ],
  gmb:{},
  analytics:{},
  activity:[
    {id:"a1",clientId:"u4",type:"listing_live",desc:"Yellow Pages listing went live",date:"Jul 4, 2025",by:"Zara (Agent)"},
    {id:"a2",clientId:"u4",type:"nap_fix",desc:"Phone corrected on MerchantCircle",date:"Jun 24, 2025",by:"Zara (Agent)"},
    {id:"a3",clientId:"u4",type:"edit_blocked",desc:"Unauthorized edit blocked on Yelp, hours change reverted",date:"Jun 22, 2025",by:"System"},
    {id:"a4",clientId:"u5",type:"listing_live",desc:"Healthgrades listing went live",date:"Jun 18, 2025",by:"Zara (Agent)"},
    {id:"a5",clientId:"u6",type:"flagged",desc:"Yelp listing flagged, unauthorized edit detected",date:"Jun 20, 2025",by:"System"},
    {id:"a6",clientId:"u6",type:"rejected",desc:"Manta listing rejected, duplicate found",date:"May 10, 2025",by:"Zara (Agent)"},
  ],
  settings:{stripe:{pubKey:""}},
};
