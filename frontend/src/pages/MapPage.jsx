import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, ExternalLink, ShieldAlert, PhoneCall } from "lucide-react";
import OfflineMap from "../components/OfflineMap.jsx";
import OsmWikiExplorer from "../components/OsmWikiExplorer.jsx";

export default function MapPage() {
  return (
    <div className="page map-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Back to Emergency Search &amp; Categories
      </Link>

      {/* Primary Emergency Map Component */}
      <OfflineMap />

      {/* Emergency Helpline Ribbon */}
      <section className="urgent-notice" style={{ marginTop: "24px" }}>
        <PhoneCall size={22} />
        <div>
          <strong>Immediate Life Threat?</strong>
          <p>
            Do not rely solely on digital maps in an unfolding disaster. Call emergency services
            immediately if network is reachable: <strong>112</strong> (Unified Emergency), <strong>108</strong> (Ambulance), <strong>101</strong> (Fire), <strong>100</strong> (Police).
          </p>
        </div>
        <a href="tel:112" className="call-button">
          Call 112
        </a>
      </section>

      {/* Interactive OpenStreetMap Wiki Explorer (Powered by openstreetmap-wiki_en_all_nopic_2026-10.zim) */}
      <div style={{ marginTop: "24px" }}>
        <OsmWikiExplorer />
      </div>
    </div>
  );
}
