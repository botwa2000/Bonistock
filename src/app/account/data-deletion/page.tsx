"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Container className="pb-24 pt-16" size="md">
        <h1 className="text-3xl font-bold text-text-primary">Data Deletion</h1>
        <p className="mt-2 text-sm text-text-secondary">
          How to delete your Bonistock account and associated data
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              Delete Your Account
            </h2>
            <p className="mt-2">
              You can delete your Bonistock account and all associated personal data
              at any time by following these steps:
            </p>
            <ol className="mt-3 list-decimal pl-5 space-y-2">
              <li>Log in to your Bonistock account at <a href="https://bonistock.com" className="text-white underline">bonistock.com</a></li>
              <li>Go to <strong>Settings</strong> (click your profile icon, then &quot;Settings&quot;)</li>
              <li>Scroll down to the <strong>Danger Zone</strong> section</li>
              <li>Click <strong>&quot;Delete Account&quot;</strong></li>
              <li>Confirm the deletion when prompted</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              What Gets Deleted
            </h2>
            <p className="mt-2">When you delete your account, the following data is removed:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Your profile information (name, email, profile picture)</li>
              <li>Your watchlists, alerts, saved mixes, and portfolios</li>
              <li>Your login sessions and authentication credentials</li>
              <li>Any linked social login connections (Google, Facebook)</li>
              <li>Two-factor authentication settings</li>
            </ul>
            <p className="mt-3">
              Active subscriptions will be canceled automatically. Your personal data
              will be anonymized within 30 days of the deletion request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              Facebook Login Users
            </h2>
            <p className="mt-2">
              If you signed up or logged in using Facebook, deleting your Bonistock
              account will remove all data we received from Facebook (name, email,
              profile picture). We do not retain any Facebook data after account
              deletion.
            </p>
            <p className="mt-2">
              You can also remove Bonistock from your Facebook account by going
              to <strong>Facebook Settings &gt; Apps and Websites</strong> and
              removing Bonistock from the list.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              Export Your Data First
            </h2>
            <p className="mt-2">
              Before deleting your account, you can download a copy of all your
              data from the <strong>Settings</strong> page by clicking
              <strong> &quot;Export My Data&quot;</strong>. This provides a JSON file
              containing your profile, watchlists, portfolios, alerts, and saved mixes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              Alternative: Email Request
            </h2>
            <p className="mt-2">
              If you cannot access your account, you can request data deletion by
              emailing <a href="mailto:privacy@bonistock.com" className="text-white underline">privacy@bonistock.com</a> from
              the email address associated with your account. We will process your
              request within 30 days as required by GDPR.
            </p>
          </section>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
