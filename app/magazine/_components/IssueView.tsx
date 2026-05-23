// Shared issue layout. Both /magazine and /magazine/[date] render this
// with their respective Issue object so the look stays identical across
// today and the archive. The wrapper is a server component; the children
// that need browser APIs (fetch live standings/TV, fetch player photo)
// are client components imported here.

import type { Issue } from "../_lib/issue";
import Masthead from "./Masthead";
import HeroArticle from "./HeroArticle";
import ColumnArticles from "./ColumnArticles";
import WCDossier from "./WCDossier";
import MercatoSection from "./MercatoSection";
import StandingsSidebar from "./StandingsSidebar";
import ArchiveShelf from "./ArchiveShelf";
import IssueNavigation from "./IssueNavigation";
import EditorialFooter from "./EditorialFooter";

interface Props {
  issue: Issue;
  /** When viewing an archived issue, we still build the shelf from "today" so
   *  the user can step back to the latest. */
  referenceDate: Date;
  /** Show the prev/next chevrons (archive pages only). */
  showSiblingNav?: boolean;
}

export default function IssueView({ issue, referenceDate, showSiblingNav = false }: Props) {
  return (
    <div>
      <Masthead
        issueNumber={issue.issueNumber}
        formattedDate={issue.formattedDate}
        tagline={issue.weekTagline}
      />

      <HeroArticle issue={issue} />
      <ColumnArticles issue={issue} />
      <WCDossier issue={issue} />
      <MercatoSection />
      <StandingsSidebar />

      <ArchiveShelf
        currentKey={issue.dateKey}
        referenceDate={referenceDate}
      />

      {showSiblingNav && (
        <IssueNavigation dateKey={issue.dateKey} referenceDate={referenceDate} />
      )}

      <EditorialFooter issue={issue} />
    </div>
  );
}
