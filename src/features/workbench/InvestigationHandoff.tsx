import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import styles from './InvestigationHandoff.module.css'

export function InvestigationHandoff() {
  return (
    <main className={styles.page}>
      <section>
        <p>CASE EB-01-017 / INVESTIGATION</p>
        <h1>调查工作台</h1>
        <span>案件已开启。物证工作台将在下一验收点接入。</span>
        <Link to="/cases/vanished-tenant">
          <ArrowLeft aria-hidden="true" size={17} />
          返回案件简报
        </Link>
      </section>
    </main>
  )
}
