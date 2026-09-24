import { BookOpenText, FileText, Quote } from 'lucide-react'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import styles from './CaseMaterials.module.css'

type CaseMaterialsProps = {
  bundle: CaseBundle
}

export function CaseMaterials({ bundle }: CaseMaterialsProps) {
  const { caseDefinition, messages } = bundle
  const text = (key: string) => translate(messages, key)

  return (
    <section className={styles.materials} aria-labelledby="materials-title">
      <header className={styles.heading}>
        <div className={styles.headingIcon} aria-hidden="true">
          <BookOpenText size={22} />
        </div>
        <div>
          <p>MATERIALS / SOURCE RECORDS</p>
          <h1 id="materials-title">{text('ui.materialsTitle')}</h1>
          <span>{text('ui.materialsDescription')}</span>
        </div>
        <strong>
          {String(
            caseDefinition.statements.length + caseDefinition.documents.length,
          ).padStart(2, '0')}{' '}
          RECORDS
        </strong>
      </header>

      <div className={styles.ledger}>
        <section aria-labelledby="statements-title">
          <div className={styles.sectionHeading}>
            <span>01</span>
            <div>
              <p>WITNESS STATEMENTS</p>
              <h2 id="statements-title">{text('ui.statementRecords')}</h2>
            </div>
          </div>
          <ol className={styles.statementList}>
            {caseDefinition.statements.map((statement, index) => (
              <li key={statement.id}>
                <div className={styles.recordMeta}>
                  <Quote aria-hidden="true" size={16} />
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span>{statement.id.toUpperCase()}</span>
                </div>
                <article>
                  <p>{text(statement.speakerKey)}</p>
                  <h3>{text(statement.titleKey)}</h3>
                  <blockquote>{text(statement.contentKey)}</blockquote>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="documents-title">
          <div className={styles.sectionHeading}>
            <span>02</span>
            <div>
              <p>DOCUMENT REGISTER</p>
              <h2 id="documents-title">{text('ui.documentRecords')}</h2>
            </div>
          </div>
          <ol className={styles.documentList}>
            {caseDefinition.documents.map((document, index) => (
              <li key={document.id}>
                <div className={styles.documentNumber}>
                  <FileText aria-hidden="true" size={17} />
                  {String(index + 1).padStart(2, '0')}
                </div>
                <article>
                  <p>{document.id.toUpperCase()}</p>
                  <h3>{text(document.titleKey)}</h3>
                  <div>{text(document.contentKey)}</div>
                  <span>{text('ui.sourceRecordVerified')}</span>
                </article>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  )
}
