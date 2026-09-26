import React from 'react'
import { Icon } from '@/lib/icons'

/**
 * Champ de mot de passe avec œil « afficher / masquer ».
 *
 * Bonne pratique :
 *   - le bouton est `type="button"` : il ne soumet jamais le formulaire ;
 *   - `aria-pressed` + libellé explicite annoncé par les lecteurs d'écran ;
 *   - le champ garde son `autoComplete` (gestionnaire de mots de passe) ;
 *   - la valeur reste dans le même `<input>` : la bascule ne change que le
 *     type d'affichage, jamais la saisie en cours.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ style, type = 'password', className, ...props }, ref) {
    const [visible, setVisible] = React.useState(false)
    const libelle = visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
    return (
      <span className={className} style={{ position: 'relative', display: 'block' }}>
        <input
          ref={ref}
          {...props}
          type={visible ? 'text' : type}
          style={{ width: '100%', paddingRight: 42, boxSizing: 'border-box', ...style }}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-label={libelle}
          title={libelle}
          onClick={() => setVisible((v) => !v)}
          style={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 'none',
            borderRadius: 8,
            background: 'transparent',
            color: 'currentColor',
            opacity: 0.6,
            cursor: 'pointer',
          }}
        >
          {visible ? Icon.eyeOff(16, 'currentColor') : Icon.eye(16, 'currentColor')}
        </button>
      </span>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
