import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import PolicyPage from "./PolicyPage";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Contact = () => {
  const { data: settings } = useStoreSettings();

  const email = settings?.email || "Shrihit02@gmail.com";
  const phone = settings?.phone || "7988140173";
  const address = settings?.address || "613, Jundla Gate, Karnal, Haryana";
  const whatsapp = (settings?.whatsapp_number || "+917988140173").replace(/[^0-9]/g, "");

  return (
    <PolicyPage
      title="Contact Us"
      description="We reply to every message, usually within two working days."
    >
      <div className="grid gap-4 not-prose">
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary transition-colors"
        >
          <Mail className="text-primary shrink-0" size={22} />
          <div>
            <p className="font-medium text-foreground">Email</p>
            <p className="text-muted-foreground text-sm">{email}</p>
          </div>
        </a>

        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary transition-colors"
        >
          <Phone className="text-primary shrink-0" size={22} />
          <div>
            <p className="font-medium text-foreground">Phone</p>
            <p className="text-muted-foreground text-sm">{phone}</p>
          </div>
        </a>

        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary transition-colors"
        >
          <MessageCircle className="text-primary shrink-0" size={22} />
          <div>
            <p className="font-medium text-foreground">WhatsApp</p>
            <p className="text-muted-foreground text-sm">Chat with us</p>
          </div>
        </a>

        <div className="flex items-center gap-4 p-4 rounded-xl border border-border">
          <MapPin className="text-primary shrink-0" size={22} />
          <div>
            <p className="font-medium text-foreground">Address</p>
            <p className="text-muted-foreground text-sm">{address}</p>
          </div>
        </div>
      </div>
    </PolicyPage>
  );
};

export default Contact;
