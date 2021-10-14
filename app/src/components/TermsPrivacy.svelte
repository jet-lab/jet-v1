<script lang="ts">
  export let launchUI: boolean;
  let termsOfUse = false;
  let privacyPolicy = false;

  const closeModal = () => {
    termsOfUse = false;
    privacyPolicy = false;
  };
</script>

{#if termsOfUse || privacyPolicy}
  <div class="modal-bg" on:click={closeModal} />
  <div class="modal">
    <div class="close">
      <i class="jet-icons close" on:click={closeModal}>✕</i>
    </div>
    {#if termsOfUse}
      <div class="modal-body">
        <h3>Jet Protocol - Terms of Service</h3>
        <h3>Published: October 7, 2021</h3>

        <h4>Introduction</h4>
        <p>
          Please read these terms of service (<b>“Terms”</b>) carefully. These
          Terms are between you and Jet Protocol Inc. (<b>“Jet Protocol,”</b>
          <b>“we,”</b> <b>“us,”</b> or <b>“our”</b>) concerning your use of
          Jet Protocol’s site, currently located at jetprotocol.io (the
          <b>“Site”</b>) which acts as a front-end to the decentralized Jet
          Protocol. These Terms apply to you (<b>“You,”</b> or <b>“User”</b>)
          as a user of the Site and Jet Protocol front-end, including all the
          products, services, tools and information made available on the
          Site.
        </p>

        <p>
          By using the Site, you agree to these Terms. IF YOU DO NOT AGREE
          WITH ALL OF THESE TERMS OF USE, THEN YOU ARE EXPRESSLY PROHIBITED
          FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.
        </p>

        <p>
          THESE TERMS OF USE INCLUDE, AMONG OTHER THINGS, A BINDING
          ARBITRATION CLAUSE AND A CLASS ACTION WAIVER. PLEASE REFER TO THE
          SECTION ENTITLED "DISPUTE RESOLUTION" BELOW FOR MORE INFORMATION.
        </p>

        <p>
          Certain features on the site may be offered while still in "beta"
          form (<b>“Beta Services”</b>). By accepting these Terms or using the
          Beta Services, You understand and acknowledge that the Beta Services
          are being provided as a "Beta" version and made available on an "As
          Is" or "As Available" basis. The Beta Services may contain bugs,
          errors, and other problems. YOU ASSUME ALL RISKS AND ALL COSTS
          ASSOCIATED WITH YOUR USE OF THE BETA SERVICES.
        </p>

        <p>
          You must be able to form a legally binding contract online either as
          an individual or on behalf of a legal entity. You represent that as
          a User, you have the legal authority to bind the company or other
          legal entity to these Terms and you are at least 18 years old or the
          age of majority where you reside, whichever is older, can form a
          legally binding contract online, and have the full, right, power and
          authority to enter into and to comply with the obligations under
          these Terms.
        </p>

        <p>
          You are advised to check these Terms periodically to familiarize
          yourself with any changes to the Terms. Jet Protocol in its sole
          discretion, reserves the right to make changes to our Terms. Changes
          are binding on Users of the Site and will take effect immediately
          upon posting. As a User, you agree to be bound by any changes,
          variations, or modifications to our terms of service and your
          continued use of the Site shall constitute acceptance of any such
          changes, variations, or modifications.
        </p>

        <h4>Site</h4>
        <p>
          Jet Protocol provides access to a decentralized finance application
          (the
          <b>“Application”</b>) on the Solana Blockchain, that allows
          individuals to borrow and lend Solana assets (the
          <b>“Cryptocurrency Assets”</b>) and transact using smart contracts
          (the <b>“Smart Contracts”</b>).
        </p>

        <p>
          Using the Jet Protocol may require that you pay a fee, such as
          transaction fees on the Solana network to perform a transaction. You
          acknowledge and agree that Jet Protocol has no control over any
          transactions, the method of payment of any transactions or any
          actual payments of transactions. Accordingly, you must ensure that
          you have a sufficient balance of the applicable cryptocurrency
          tokens stored at your protocol-compatible wallet address (<b
            >“Cryptocurrency Wallet”</b
          >) to complete any transaction on the Jet Protocol or the Solana
          network before initiating such a transaction.
        </p>

        <h4>Access to the Site</h4>
        <p>
          Access to the Site is provided "AS IS" and "as available" basis
          only. We do not guarantee that the Site, or any content or services
          on it, will always be available or uninterrupted. From time to time,
          access may be interrupted, suspended or restricted, including
          because of a fault, error or unforeseen circumstances or because we
          are carrying out planned maintenance.
        </p>

        <p>
          We reserve the right to limit the availability of the Site to any
          person, geographic area or jurisdiction we so desire and/or to
          terminate your access to and use of the site, at any time and in our
          sole discretion.
        </p>

        <p>
          We may suspend or disable your access to the Site if we consider it
          reasonable to do so.
        </p>

        <p>
          We may remove or amend the content of the Site at any time. However,
          some of the content may be out of date at any given time and we are
          under no obligation to update it. We do not guarantee that the Site,
          or any content on it, will be free from errors or omissions.
        </p>

        <p>
          We will not be liable to you for any loss or damage you may suffer
          as a result of the Site being unavailable at any time for any
          reason.
        </p>

        <p>
          You will comply with all applicable domestic and international laws,
          statutes, ordinances and regulations applicable to your use of the
          site.
        </p>

        <p>As a condition to accessing or using the Site, you:</p>
        <ul>
          <li>will only use the Site in accordance with these Terms;</li>
          <li>
            will ensure that all information that you provide on the Site is
            current, complete, and accurate
          </li>
          <li>will ensure compliance with all US securities laws; and</li>
          <li>
            will maintain the security and confidentiality of access to your
            cryptocurrency wallet address.
          </li>
        </ul>

        <p>As a condition to accessing or using the Site, you will not:</p>
        <ul>
          <li>
            Violate any applicable law, including, without limitation, any
            relevant and applicable anti-money laundering and anti-terrorist
            financing laws and any relevant and applicable privacy and data
            collection laws, in each case as may be amended;
          </li>
          <li>
            Export, reexport, or transfer, directly or indirectly, any Jet
            Protocol technology in violation of applicable export laws or
            regulations;
          </li>
          <li>
            Infringe on or misappropriate any contract, intellectual property
            or other third-party right, or commit a tort while using the Site;
          </li>
          <li>
            Misrepresent the truthfulness, sourcing or reliability of any
            content on the Site;
          </li>
          <li>
            Use the Site in any manner that could interfere with, disrupt,
            negatively affect, or inhibit other users from fully enjoying the
            Site or the Jet Protocol, or that could damage, disable,
            overburden, or impair the functioning of the Site or the Jet
            Protocol in any manner;
          </li>
          <li>
            Attempt to circumvent any content filtering techniques or security
            measures that Jet Protocol employs on the Site, or attempt to
            access any service or area of the Site that you are not authorized
            to access;
          </li>
          <li>
            Use any robot, spider, crawler, scraper, or other automated means
            or interface not provided by us, to access the Site to extract
            data;
          </li>
          <li>
            Introduce any malware, virus, Trojan horse, worm, logic bomb,
            drop-dead device, backdoor, shutdown mechanism or other harmful
            material into the Site;
          </li>
          <li>
            Post content or communications on the Site that are, in our sole
            discretion, libelous, defamatory, profane, obscene, pornographic,
            sexually explicit, indecent, lewd, vulgar, suggestive, harassing,
            hateful, threatening, offensive, discriminatory, bigoted, abusive,
            inflammatory, fraudulent, deceptive or otherwise objectionable;
          </li>
          <li>
            Post content on the Site containing unsolicited promotions,
            commercial messages or any chain messages or user content designed
            to deceive or trick the user of the Site; or
          </li>
          <li>
            Encourage or induce any third party to engage in any of the
            activities prohibited under these Terms.
          </li>
        </ul>

        <p>
          You acknowledge that the Site and your use of the Site contain
          certain risks, including without limitation the following risks:
        </p>
        <ul>
          <li>
            That any Smart Contracts you interact with are entirely your own
            responsibility and liability, and that Jet Protocol is not party
            to the Smart Contracts;
          </li>
          <li>
            At any time, your access to your Cryptocurrency Assets may be
            suspended or terminated or there may be a delay in your access or
            use of your Cryptocurrency Assets which may result in the
            Cryptocurrency Assets diminishing in value or you being unable to
            complete a Smart Contract; and
          </li>
          <li>
            The Site and/or application may be suspended or terminated for any
            or no reason, which may limit your access to your Cryptocurrency
            Assets.
          </li>
        </ul>

        <p>Accordingly, you expressly agree that:</p>
        <ul>
          <li>
            You assume all risk in connection with your access and use of the
            Site, the Application and the Smart Contracts; and
          </li>
          <li>
            that you expressly waive and release Jet Protocol from any and all
            liability, claims, causes of action, or damages arising from or in
            any way related to your use of the Site, the Application or the
            Smart Contracts.
          </li>
        </ul>

        <h4>OFAC Compliance</h4>
        <p>
          The U.S. Department of the Treasury, through the Office of Foreign
          Assets Control (<b>“OFAC”</b>), prohibits U.S. companies from
          engaging in all or certain commercial activities with certain
          sanctioned countries (each a
          <b>“Sanctioned Country”</b>) and certain individuals, organizations
          or entities, including without limitation, certain
          <b>“Specially Designated Nationals”</b>
          (<b>“SDN”</b>) listed by OFAC. If you use the Site, you expressly
          represent that you are not located in a Sanctioned Country or is
          listed as an SDN. If Jet Protocol determines that the Site is being
          used by prohibited persons, it will take any and all actions to
          terminate that User’s access to the Site.
        </p>

        <h4>Third-Party Links</h4>
        <p>
          The Site may contain hyperlinks or references to third party
          websites. Any such hyperlinks or references are provided for your
          information and convenience only. We have no control over third
          party websites and accept no legal responsibility for any content,
          material or information contained in them. The display of any
          hyperlink and reference to any third-party website does not mean
          that we endorse that third party's website, products or services.
          Your use of a third-party site may be governed by the terms and
          conditions of that third-party site.
        </p>

        <h4>Privacy Policy</h4>
        <p>
          Certain areas of our website may record and collect information
          about you. You can find more information about how we will you
          process your personal information in our Privacy Policy.
        </p>

        <h4>Intellectual Property Rights</h4>
        <p>
          We are the owner of all intellectual property rights in the Site and
          the material published on them. These works are protected by
          copyright laws and all such rights are reserved. Jet
          Protocolprotocol.io is the uniform resource locator (<b>“URL”</b>)
          of Jet Protocol. You will not make use of this URL on another
          website or digital platform without our prior written consent. You
          agree not to monitor, use or copy our web pages without our prior
          consent. Any unauthorized use or reproduction may be prosecuted.
        </p>

        <p>
          You will retain ownership of all copyright in data you upload or
          submit to the Site. You grant us a worldwide, royalty-free,
          irrevocable license to use, copy, distribute or publish and send
          this data in any manner.
        </p>

        <h4>Disclaimers</h4>
        <p>
          To the fullest extent permitted by law, in no event will Jet
          Protocol be responsible to you for any: (1) financial losses; (2)
          loss of use, data, business or profits; or (3) indirect, special
          consequential, exemplary, or punitive damages. This will be whether
          or not the Jet Protocol warned of the possibility of such damages.
          Notwithstanding anything to the contrary in these terms, nothing in
          these terms excludes or limits liability for fraud, fraudulent
          misrepresentation, or for death or personal injury caused by gross
          negligence.
        </p>

        <p>
          You agree to defend, indemnify and hold harmless Jet Protocol, its
          affiliates, licensors and service providers, and its and their
          respective officers, directors, employees, contractors, agents,
          licensors, suppliers, successors and assigns from and against any
          claims, liabilities, damages, judgments, awards, losses, costs,
          expenses or fees (including reasonable attorneys' fees) arising out
          of or relating to your violation of these Terms or your use of the
          Site, including.
        </p>

        <p>
          We do not guarantee that the Site will be secure or free from bugs
          or viruses.
        </p>
        <p>
          You are responsible for configuring your information technology,
          computer programs and platform in order to access the Site. You
          should use your own virus protection software.
        </p>
        <p>
          We cannot promise that the use of the Site, or any content taken
          from the Site, will not infringe the rights of any third party.
        </p>
        <p>
          Certain content and materials available on the Site are for
          informational purposes only and is not intended to address your
          particular requirements. In particular, the content and materials
          available on the Site does not constitute any form of advice or
          recommendation by us, should not be regarded as an offer,
          solicitation, invitation or recommendation to buy or sell
          investments, securities or any other financial services and is not
          intended to be relied upon by you in making any specific investment
          or other decisions. We recommend that you seek independent advice
          from financial advisory before making any such decision.
        </p>
        <p>
          Nothing included in the site constitutes an offer or solicitation to
          sell, or distribution of, investments and related services by Jet
          Protocol to anyone in any jurisdiction.
        </p>

        <h4>General</h4>
        <p>
          If any clause or part of any clause of these Terms is found to be
          void, unenforceable or invalid, then it will be severed from these
          Terms, leaving the remainder in full force and effect, provided that
          the severance has not altered the basic nature of these Terms.
        </p>
        <p>
          No single or partial exercise, or failure or delay in exercising any
          right, power or remedy by us shall constitute a waiver by us of, or
          impair or preclude any further exercise of, that or any right, power
          or remedy arising under these terms and conditions or otherwise.
        </p>
        <p>
          If any of the provisions in these Terms are found to be illegal,
          invalid or unenforceable by any court of competent jurisdiction, the
          remainder shall continue in full force and effect.
        </p>
        <p>
          All disclaimers, indemnities and exclusions in these Terms shall
          survive termination of the Terms and shall continue to apply during
          any suspension or any period during which the Site is not available
          for you to use for any reason whatsoever.
        </p>
        <p>
          These Terms and the documents referred to in them set out the entire
          agreement between you and us with respect to your use of the site,
          Jet Protocol and the services provided via the site and supersede
          any and all prior or contemporaneous representations, communications
          or agreements (written or oral) made between you or us.
        </p>

        <h4>Contacting Us</h4>
        <p>
          Should you have any question about these Terms, or wish to contact
          us for any reason whatsoever, please do so by sending us an email
          hello@jetprotocol.io.
        </p>
        <p>
          We will use our best efforts to resolve any potential disputes
          through informal, good faith negotiations. If a potential dispute
          arises, you must contact us by sending an email to
          hello@jetprotocol.io so that we can attempt to resolve it without
          resorting to formal dispute resolution. If we aren’t able to reach
          an informal resolution within sixty days of your email, then you and
          we both agree to resolve the potential dispute according to the
          process set forth below.
        </p>

        <h4>Dispute Resolution</h4>
        <p>
          With respect to all persons and entities, regardless of whether they
          have obtained or used the site for personal, commercial or other
          purposes, all disputes, controversies or claims must be brought in
          the parties’ individual capacity, and not as a plaintiff or class
          member in any purported class action, collective action or other
          representative proceeding. This waiver applies to class arbitration,
          and, unless we agree otherwise, the arbitrator may not consolidate
          more than one person’s claims. You agree that, by entering into this
          agreement, you and Jet Protocol are each waiving the right to a
          trial by jury or to participate in a class action, collective
          action, or other representative proceeding of any kind.
        </p>
        <p>
          Any dispute, controversy, or claim arising out of or in relation to
          these Terms, including (but not limited) to the validity,
          invalidity, breach or termination thereof, the Site, or any other
          acts or omissions for which you may content that we are liable,
          including (but not limited to) any claim or controversy as to
          arbitrability, shall be settled by arbitration in accordance with
          the JAMS Optional Expedited Arbitration Procedures. The number of
          arbitrators shall be one or three; the seat of the arbitration shall
          be determined by the arbitrator(s); the arbitral proceedings shall
          be conducted in English. The applicable law shall be California.
        </p>
        <p>
          You understand that you are required to resolve all Disputes by
          binding arbitration. The arbitration shall be held on a confidential
          basis before a single arbitrator, who shall be selected pursuant to
          JAMS rules. The arbitration will be held in San Francisco,
          California, unless you and we both agree to hold it elsewhere.
          Unless we agree otherwise, the arbitrator may not consolidate your
          claims with those of any other party. Any judgment on the award
          rendered by the arbitrator may be entered in any court of competent
          jurisdiction.
        </p>
        <p>
          The arbitrator may award declaratory or injunctive relief only in
          favor of the claimant and only to the extent necessary to provide
          relief warranted by the claimant’s individual claim. The JAMS Rules
          and instructions for how to initiate an arbitration are available
          from JAMS at http://www.jamsadr.com or 1-800-352-5267.
        </p>
        <p>
          -----
          <br />Jet Protocol
          <br />hello@jetprotocol.io
        </p>
      </div>
    {:else}
      <div class="modal-body">
        <h3>Jet Protocol - Privacy Policy</h3>
        <h3>Published: October 7, 2021</h3>
        <p />
        <p>
          This Privacy Policy (<b>“Policy”</b>) describes how Jet Protocol
          Holdings LLC (<b>“Jet Protocol,”</b> <b>“we,”</b> <b>“us,”</b> or
          <b>“our”</b>) may collect, use and disclose information, and your
          choices regarding this information. Please read this Policy
          carefully and contact us with questions at hello@jetprotocol.io.
        </p>

        <p>
          Jet Protocol provides access to a decentralized finance application
          (the <b>“Application”</b>) on the Solana Blockchain, that allows
          individuals to borrow and lend Solana assets (the
          <b>“Cryptocurrency assets”</b>) and transact using smart contracts
          (the <b>“Smart Contracts”</b>).
        </p>

        <h4>Applicability of this Policy</h4>
        <p>
          This Policy applies to our services, concerning your use of Jet
          Protocol’s site, currently located at Jetprotocol.io (the <b
            >“Site”</b
          >) and related services (collectively, the <b>“Services”</b>). If
          you do not agree with the terms of this Policy, do not access or use
          the Services, Sites, or any other aspect of our business. By using
          the Site, you agree to these Terms.
        </p>

        <h4>What We Collect</h4>
        <p>When you interact with our Services, we may collect:</p>

        <ul>
          <li><b>Contact Information</b>, such as your email address.</li>
          <li>
            <b>Financial Information</b>, such as your network address,
            cryptocurrency wallet information, transaction history, trading
            data, and associated fees paid.
          </li>
          <li>
            <b>Transaction Information</b>, such as information about the
            transactions you make on our Services, such as the type of
            transaction amount, and timestamp.
          </li>
          <li>
            <b>Correspondence</b>, such as your feedback, questionnaire and
            other survey responses, and information you provide to our support
            teams, including via our help chat.
          </li>
          <li>
            <b>Online Identifiers</b>, such as geo location/tracking details,
            browser fingerprint, operating system, browser name and version,
            and/or personal IP addresses.
          </li>
          <li>
            <b>Usage Data</b>, such as user preferences and other data
            collected via cookies and similar technologies.
          </li>
          <li>
            <b>Information We Get from Others:</b> We may get information about
            you from the other sources as required or permitted by applicable law,
            including public databases. We may combine the information collected
            from these sources with the information we get from this Site in order
            to comply with our legal obligations and limit the use of our Services
            in connection with fraudulent or other illicit activities.
          </li>
          <li>
            <b>Information from Cookies and Other Tracking Technologies:</b> We,
            and third parties we authorize, may use cookies, web beacons, and similar
            technologies to record your preferences, track the use of our Sites
            and mobile apps, and collect information about the use of the Services,
            as well as about our interactions with you. This information may include
            internet protocol (IP) addresses, browser type, internet service provider
            (ISP), referring/exit pages, operating system, date/time stamp, and
            clickstream data, and information about your interactions with the
            communications we send to you. We may combine this automatically collected
            log information with other information we collect about you. You may
            choose to set your web browser to refuse cookies, or to alert you when
            cookies are being sent. If you do so, please note that some parts of
            our Services may not function properly.
          </li>
        </ul>

        <h4>How We Use Information</h4>
        <p>
          We use your information in accordance with your instructions,
          including any applicable terms in the Terms of Use, and as required
          by applicable law. We may also use the information we collect for:
        </p>
        <ul>
          <li>
            Providing Services and Features:
            <ul>
              <li>
                We may use the information we collect to provide, personalize,
                maintain. And improve our products and Services, including as
                we described in the Terms of Use. This includes using
                information to:
                <ul>
                  <li>
                    Operate, maintain, customize, measure, and improve our
                    Services, and manage our business;
                  </li>
                  <li>Create and update user accounts;</li>
                  <li>Process transactions;</li>
                  <li>
                    Send information, including confirmations, notices,
                    updates, security alerts, and support and administrative
                    messages; and
                  </li>
                  <li>To create de-identified or aggregated data.</li>
                </ul>
              </li>
            </ul>
          </li>
          <li>
            Safety and Security:
            <ul>
              <li>
                We may use your information to help maintain the safety,
                security, and integrity of you and our Services, including to:
                <ul>
                  <li>
                    Protect, investigate, and deter against fraudulent,
                    unauthorized, or illegal activity;
                  </li>
                  <li>
                    Monitor and verify identity or services access, combat
                    spam, malware or security risks;
                  </li>
                  <li>
                    Perform internal operations necessary to provide our
                    Services, including to troubleshoot software bugs and
                    operational problems;
                  </li>
                  <li>
                    Enforce our agreements with third parties, and address
                    violations of our Terms of Use or agreements for other
                    Services; and
                  </li>
                  <li>
                    Comply with applicable security laws and regulations.
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li>
            Customer Support:
            <ul>
              <li>
                We may use information we collect to provide customer support,
                including to:
                <ul>
                  <li>
                    Direct questions to the appropriate customer support
                    person;
                  </li>
                  <li>Investigate and address user concerns; and</li>
                  <li>
                    Monitor and improve our customer support responses and
                    processes.
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li>
            Research and Development:
            <ul>
              <li>
                We may use the information we collect for testing, research,
                analysis, and product development to improve your experience.
                This helps us improve and enhance the safety and security of
                our Services, improve our ability to prevent the use of our
                Services for illegal or improper purposes and develop new
                features and products relating to our Services.
              </li>
            </ul>
          </li>
          <li>
            Legal and Regulatory Compliance:
            <ul>
              <li>
                We may verify your identity by comparing the personal
                information you provide against third-party databases and
                public records. We may use the information we collect to
                investigate or address claims or disputes relating to use of
                our Services, or as otherwise allowed by applicable law, or as
                requested by regulators, government entities, and official
                inquiries.
              </li>
            </ul>
          </li>
          <li>
            Direct Marketing:
            <ul>
              <li>
                We may use the information we collect to market our Services
                to you. This may include sending you communications about our
                Services, features, promotions, surveys, news, updates, and
                events, and managing your participation in these promotions
                and events. If you do not want us to send you marketing
                communications, please opt out by selecting <b
                  >“unsubscribe”</b
                > to any marketing emails sent by us or by contacting us at hello@jetprotocol.io
              </li>
            </ul>
          </li>
        </ul>

        <h4>How We Share & Disclose Information</h4>
        <p>We may share your information in the following circumstances:</p>
        <ul>
          <li>
            <b>With Your Consent:</b> For example, you may let us share personal
            information with others for their own marketing uses. Those uses will
            be subject to their privacy policies.
          </li>
          <li>
            <b>To Comply with Our Legal Obligations:</b> We may share your information:
            (A) to cooperate with government investigations; (B) when we are compelled
            to do so by subpoena, court order, or similar legal procedure; (C)
            when we believe in good faith that the disclosure of personal information
            is necessary to prevent harm to another person; (D) to report suspected
            illegal activity; or (E) to investigate violations of our User Agreement
            or any other applicable policies.
          </li>
          <li>
            <b>With Service Providers:</b> We may share your information with service
            providers who help facilitate business and compliance operations such
            as marketing and technology services. Our contracts require these service
            providers to only use your information in connection with the services
            they perform for us.
          </li>
          <li>
            <b>During a Change to Our Business:</b> If we engage in a merger, acquisition,
            bankruptcy, dissolution, reorganization, sale of some or all of our
            assets or stock, financing, public offering of securities, acquisition
            of all or a portion of our business, a similar transaction or proceeding,
            or steps in contemplation of such activities, some or all of your information
            may be shared or transferred, subject to standard confidentiality arrangements.
          </li>
          <li>
            <b>Aggregated or De-identified Data:</b> We may share aggregated and/or
            anonymized data with others for their own uses.
          </li>
        </ul>

        <h4>Data Retention</h4>
        <p>
          To view or update your information, contact us at
          hello@jetprotocol.io. We store your information throughout the life
          of your use of the protocol and retain your information for a
          minimum of five years to comply with our legal obligations or to
          resolve disputes. If you cease using the protocol, we will neither
          use your information for any further purposes, nor sell or share
          your information with third parties, except as necessary to prevent
          fraud and assist law enforcement, as required by law, or in
          accordance with this Policy.
        </p>

        <h4>Security</h4>
        <p>
          We maintain administrative, technical and physical safeguards
          designed to protect the personal information we maintain against
          unauthorized access or disclosure. No system can be completely
          secure. Therefore, although we take steps to secure your
          information, we cannot guarantee that your information, searches, or
          other communication will always remain secure. You are responsible
          for all activity on the protocol relating to any of your network
          addresses and/or cryptocurrency wallets.
        </p>

        <h4>Changes to this Policy</h4>
        <p>
          If we make any changes, we will change the Last Updated date above.
          We encourage you to review this Policy to stay informed. If we make
          material changes, we will provide additional notice, such as via the
          email specified in your account or through the Services or Sites.
        </p>

        <h4>Notice to California Residents:</h4>
        <p>
          We are required by the California Consumer Privacy Act of 2018 (<b
            >“CCPA”</b
          >) to provide this CCPA Notice to California residents to explain
          how we collect, use and share their personal information, and the
          rights and choices we offer California residents our handling of
          their personal information.
        </p>

        <h4>CCPA Scope and Exclusions:</h4>
        <p>
          This CCPA Notice apply only to California residents whose
          interactions with us are limited to:
        </p>
        <ul>
          <li>Visiting our consumer websites; and</li>
          <li>Signing up for email alerts.</li>
        </ul>
        <p>
          This CCPA Notice does not apply to the personal information we
          collect, use or disclose about:
        </p>
        <ul>
          <li>
            Individuals who provide information to us to initiate or complete
            the process of trading on our platform; or
          </li>
          <li>
            Representatives of businesses that seek to obtain our products or
            services, or to provide products or services to us.
          </li>
        </ul>

        <h4>Privacy Practices:</h4>
        <p>
          We do not "sell" the personal information we collect (as such term
          is defined in the CCPA) for monetary value (and will not sell it
          without providing a right to opt out). Like many companies, we may
          use third-party cookies for our advertising purposes.
        </p>

        <h4>Privacy Rights:</h4>
        <p>The CCPA grants individuals the following rights:</p>
        <ul>
          <li>
            <b>Information:</b> You can request information about how we have collected,
            used and shared your personal information during the past 12 months.
            For details about the personal information, we have collected over
            the last 12 months, including the categories of sources, please see
            the What We Collect section of this Policy. We collect this information
            for the business and commercial purposes described in the How We Use
            Information section of this Policy. We share this information with
            the categories of third parties described in the How We Share and Disclose
            Information section of this Policy.
          </li>
          <li>
            <b>Access:</b> You can request a copy of the personal information that
            we maintain about you.
          </li>
          <li>
            <b />Deletion: You can ask us to delete the personal information
            that we collected or maintain about you.
          </li>
        </ul>
        <p>
          Please note that the CCPA limits these rights by, for example,
          prohibiting us from providing certain sensitive information in
          response to an access request and limiting the circumstances in
          which we must comply with a deletion request. We will also respond
          to requests for information and access only to the extent we are
          able to associate with a reasonable effort the information we
          maintain with the identifying details you provide in your request.
          If we deny your request, we will communicate our decision to you.
          You are entitled to exercise the rights described above free from
          discrimination.
        </p>

        <h4>How to Submit a Request</h4>
        <p>
          To request access to or deletion of personal information to
          hello@jetprotocol.io
        </p>

        <h4>Identity Verification</h4>
        <p>
          The CCPA requires us to verify the identity of the individual
          submitting a request to access or delete personal information before
          providing a substantive response to the request. We will ask you to
          verify your identity when you submit a request.
        </p>

        <h4>Authorized Agents</h4>
        <p>
          California residents can empower an "authorized agent" to submit
          requests on their behalf. We will require the authorized agent to
          have a written authorization confirming that authority.
        </p>

        <h4>Reasons We Can Share your Personal Information</h4>
        <p>
          We need to share users’ personal information to operate certain
          aspects of the Jet Protocol and our business. Below, whether we
          share your personal information, the reasons we share your personal
          information and whether you can limit this sharing:
        </p>
        <ul>
          <li>
            We share users’ personal information for our everyday business
            purposes, such as to process and match your orders and respond to
            court orders and legal investigations. You cannot limit our
            sharing of this information.
          </li>
          <li>
            We share users’ personal information for our marketing purposes,
            such as to offer our products and services to you. You cannot
            limit our sharing of this information.
          </li>
          <li>
            We do not share users’ personal information for joint marketing
            with financial companies.
          </li>
          <li>
            We do not share users’ personal information for our affiliates’
            everyday business purposes.
          </li>
          <li>
            We do not share users’ personal information for our affiliates to
            market to you.
          </li>
          <li>
            We do not share users’ personal information for nonaffiliates to
            market to you.
          </li>
        </ul>

        <h4>How Does Jet Protocol Protect My Personal Information?</h4>
        <p>
          To protect your personal information from unauthorized access and
          use, we use security measures that comply with federal law. These
          measures include computer safeguards and secured files and
          buildings.
        </p>
        <h4>Why Can’t I Limit All Sharing?</h4>
        <p>
          Applicable laws give you the right to limit only (1) sharing for
          affiliates’ everyday business purposes, (2) affiliates from using
          your information to market to you, and (3) share for nonaffiliates
          to market to you. We do not share any information to any of those
          parties for those reasons; thus, you may not limit sharing of
          information.
        </p>
        <p>
          As used in this Additional Disclosures section, "affiliates" refer
          to companies related by common ownership or control; "nonaffiliates"
          refer to companies no related by common ownership or control; and
          "joint marketing" refers to a formal agreement between nonaffiliated
          financial companies that together market financial products or
          services to you.
        </p>

        <h4>Contact Us</h4>
        <p>
          Please contact us if you have any questions about this Policy or if
          you are seeking to exercise any of your statutory rights. We will
          respond within a reasonable timeframe. You may contact us at
          hello@jetprotocol.io
        </p>
      </div>
    {/if}
  </div>
{/if}

<div
  class="flex justify-end terms-footer"
  style={launchUI ? "opacity: 1;" : "opacity: 0;"}>
  <span on:click={() => {termsOfUse = true;}}>Terms of Use</span>
  <span on:click={() => {privacyPolicy = true;}}>Privacy Policy</span>
</div>

<style>
  .terms-footer {
    bottom: 7px;
    width: 94%;
    position: absolute;
  }

  .terms-footer span {
    cursor: pointer;
    padding: 10px;
    font-size: 12px;
    color: var(--dark-grey);
    width: 100px;
  }

  .modal-bg {
    z-index: 125;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    height: 65%;
    width: 55%;
    padding: 2.5em;
    z-index: 150;
  }

  .close {
    display: flex;
    justify-content: flex-end;
    font-size: 1.25em;
  }

  .modal-body {
    text-align: left;
    overflow-y: scroll;
    height: 95%;
    font-family: Montserrat, sans-serif !important;
    font-weight: 300;
    color: #000000;
  }

  h3,
  h4 {
    font-family: "Montserrat", sans-serif;
    margin-bottom: 0;
    font-weight: 600;
  }

  h3 {
    margin: 0;
  }

  p {
    padding-top: 0;
    margin-bottom: 1em;
    font-size: 14px;
    color: #000000;
  }

  ul {
    padding-bottom: 13px;
    font-size: 14px;
  }

  li {
    left: 2em;
    line-height: 150%;
  }

  b {
    font-weight: 400 !important;
  }
</style>
