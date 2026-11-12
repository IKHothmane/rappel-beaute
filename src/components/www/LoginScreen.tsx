import Image from "next/image";
import Link from "next/link";
import "./login-screen.css";

export function LoginScreen({ children }: { children: React.ReactNode }) {
  return (
    <section className="rb-login" aria-label="Connexion à Rappel Beauty">
      <div className="rb-login-scene" aria-hidden="true">
        <Image
          className="rb-login-reception"
          src="/brand/Réception de salon Rappel Beauty en 3D.png"
          alt=""
          fill
          sizes="(max-width: 800px) 1px, 50vw"
          priority
        />
        <Image
          className="rb-login-spa"
          src="/brand/footer-spa-cutout.png"
          alt=""
          width={1774}
          height={887}
          sizes="(max-width: 800px) 1px, 360px"
        />
      </div>
      <div className="rb-login-panel">
        <Link className="rb-login-brand" href="/" aria-label="Rappel Beauty — Accueil">
          <Image
            src="/brand/logo.png"
            alt="Rappel Beauty"
            width={256}
            height={128}
            sizes="220px"
            priority
          />
        </Link>
        <p className="rb-login-tagline">Le logiciel de gestion des instituts de beauté</p>
        {children}
        <nav className="rb-login-legal" aria-label="Liens utiles">
          <Link href="/">Accueil</Link>
          <Link href="/confidentialite/">Confidentialité</Link>
          <Link href="/contact/">Besoin d’aide ?</Link>
        </nav>
      </div>
    </section>
  );
}
