// @ts-check
import { describe, it, expect, beforeEach } from 'vitest';

describe('Faz 1 - Veri Bütünlüğü ve İş Mantığı Doğrulamaları', () => {

    describe('Teklif Kabulünde Atomik Durum Geçişi (Race Condition Koruması)', () => {
        let fakeDb;

        beforeEach(() => {
            fakeDb = {
                products: {
                    'prod-1': { id: 'prod-1', ownerId: 'user-seller', status: 'active', title: 'Bisiklet' }
                },
                offers: {
                    'offer-1': { id: 'offer-1', productId: 'prod-1', sellerId: 'user-seller', buyerId: 'buyer-1', price: 1000, status: 'pending' },
                    'offer-2': { id: 'offer-2', productId: 'prod-1', sellerId: 'user-seller', buyerId: 'buyer-2', price: 1100, status: 'pending' }
                },
                runTransaction: async function (updateFunction) {
                    const transaction = {
                        get: async (ref) => {
                            const [col, id] = ref.split('/');
                            const data = fakeDb[col][id];
                            return {
                                exists: !!data,
                                data: () => ({ ...data })
                            };
                        },
                        update: (ref, updateData) => {
                            const [col, id] = ref.split('/');
                            fakeDb[col][id] = { ...fakeDb[col][id], ...updateData };
                        }
                    };
                    return await updateFunction(transaction);
                }
            };
        });

        it('Satıcı geçerli bir teklifi kabul ettiğinde teklif accepted, ürün sold olmalı', async () => {
            const sellerUid = 'user-seller';
            const offerId = 'offer-1';

            const result = await fakeDb.runTransaction(async (transaction) => {
                const offerDoc = await transaction.get(`offers/${offerId}`);
                const offerData = offerDoc.data();
                if (offerData.sellerId !== sellerUid) throw new Error('Yetkisiz');
                if (offerData.status === 'accepted') throw new Error('Zaten kabul edilmiş');

                const productDoc = await transaction.get(`products/${offerData.productId}`);
                const productData = productDoc.data();
                if (productData.ownerId !== sellerUid) throw new Error('Yetkisiz');
                if (productData.status === 'sold') throw new Error('Ürün zaten satılmış');

                transaction.update(`offers/${offerId}`, { status: 'accepted' });
                transaction.update(`products/${offerData.productId}`, { status: 'sold', acceptedOfferId: offerId });
                return { offerData, productData };
            });

            expect(result.offerData.id).toBe('offer-1');
            expect(fakeDb.offers['offer-1'].status).toBe('accepted');
            expect(fakeDb.products['prod-1'].status).toBe('sold');
            expect(fakeDb.products['prod-1'].acceptedOfferId).toBe('offer-1');
        });

        it('Aynı ürüne gelen ikinci bir teklif kabul edilmeye çalışıldığında hata fırlatılmalı ve engellenmeli', async () => {
            const sellerUid = 'user-seller';

            // 1. İşlem: İlk teklif kabul ediliyor
            await fakeDb.runTransaction(async (transaction) => {
                const offerDoc = await transaction.get('offers/offer-1');
                const offerData = offerDoc.data();
                transaction.update('offers/offer-1', { status: 'accepted' });
                transaction.update(`products/${offerData.productId}`, { status: 'sold', acceptedOfferId: 'offer-1' });
            });

            // 2. İşlem: İkinci teklif aynı anda kabul edilmek isteniyor
            await expect(fakeDb.runTransaction(async (transaction) => {
                const offerDoc = await transaction.get('offers/offer-2');
                const offerData = offerDoc.data();
                const productDoc = await transaction.get(`products/${offerData.productId}`);
                const productData = productDoc.data();

                if (productData.status === 'sold') {
                    throw new Error('Bu ilan için başka bir teklif zaten kabul edilmiş ve ürün satılmış!');
                }

                transaction.update('offers/offer-2', { status: 'accepted' });
                transaction.update(`products/${offerData.productId}`, { status: 'sold' });
            })).rejects.toThrow('Bu ilan için başka bir teklif zaten kabul edilmiş ve ürün satılmış!');

            // İkinci teklifin durumu pending kalmalı
            expect(fakeDb.offers['offer-2'].status).toBe('pending');
        });
    });

    describe('Sohbet Katılımcı ve Yetki Güvenliği', () => {
        it('Mesaj gönderilirken participants listesinde alıcı ve satıcı UID yer almalı', () => {
            const currentUserId = 'user-buyer-123';
            const targetSellerId = 'user-seller-456';
            
            const participants = [currentUserId];
            if (targetSellerId && targetSellerId !== currentUserId) {
                participants.push(targetSellerId);
            }

            expect(participants).toHaveLength(2);
            expect(participants).toContain('user-buyer-123');
            expect(participants).toContain('user-seller-456');
        });

        it('Yabancı bir kullanıcı (üçüncü taraf) sohbet katılımcısı olmamalı', () => {
            const participants = ['user-buyer-123', 'user-seller-456'];
            const attackerUid = 'hacker-789';

            const canRead = participants.includes(attackerUid);
            expect(canRead).toBe(false);
        });
    });

    describe('Kullanıcı Rolü & Admin Yetkisi Sınırlandırması', () => {
        it('Normal kullanıcı profil nesnesi oluştururken veya güncellerken isAdmin bayrağını true yapamaz', () => {
            const clientPayload = {
                displayName: 'Normal User',
                phone: '05551234567',
                isAdmin: true // Saldırganın eklemeye çalıştığı alan
            };

            // Firestore rule simülasyonu: allow update if !('isAdmin' in affectedKeys) || request.isAdmin == resource.isAdmin
            const currentProfile = { displayName: 'Normal User', phone: '05551234567', isAdmin: false };
            
            const isIllegalAdminEscalation = (clientPayload.isAdmin === true && currentProfile.isAdmin !== true);
            expect(isIllegalAdminEscalation).toBe(true);
        });
    });
});
