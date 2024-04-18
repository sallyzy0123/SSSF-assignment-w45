import {GraphQLError} from 'graphql';
import catModel from '../models/catModel';
import {Cat, Location, LocationInput} from '../../types/DBTypes';
// import mongoose, {CustomAggregationExpressionOperatorReturningAny} from 'mongoose';
// import fetchData from '../../functions/fetchData';
import {MyContext} from '../../types/MyContext';


// TODO: create resolvers based on cat.graphql
// note: when updating or deleting a cat, you need to check if the user is the owner of the cat
// note2: when updating or deleting a cat as admin, you need to check if the user is an admin by checking the role from the user object
// note3: updating and deleting resolvers should be the same for users and admins. Use if statements to check if the user is the owner or an admin

export default {
    Query: {
        cats: async (): Promise<Cat[]> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            };
            const cats = await catModel.find();
            console.log('cats:', cats); 
            cats.forEach((cat) => {
                cat.id = cat._id;
            });
            return cats;
        },
        catById: async (
            _parent: undefined,
            args: {id: string},
        ): Promise<Cat> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            };
            const cat = await catModel.findById(args.id);
            if (!cat) {
                throw new GraphQLError('Cat not found', {
                    extensions: {code: '404'}
                });
            }
            return cat;
        },
        catsByArea: async (
            _parent: undefined,
            args: {topRight: Location,
                bottomLeft:  Location}
        ): Promise<Cat[] | {message: string}> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            };
            const rightCorner = [args.topRight.lat, args.topRight.lng];
            const leftCorner = [args.bottomLeft.lat, args.bottomLeft.lng];

            const cats = await catModel.find({
                location: {
                    $geoWithin: {
                        $box: [leftCorner, rightCorner]
                    }
                }
            });
            if (cats.length === 0) {
                return {message: 'No cat found in this area'};
            }
            return cats;
        },
        catsByOwner: async (
            _parent: undefined,
            args: {ownerId: string},
        ): Promise<Cat[] | {message: string}> => {
            if (!process.env.AUTH_URL) {
                throw new GraphQLError('Auth URL not set in .env file');
            };
            const cats = await catModel.find({owner: args.ownerId});
            if (cats.length === 0) {
                return {message: 'No cat belongs to this owner'};
            }
            return cats;
        },
    },
    Mutation: {
        createCat: async (
            _parent: undefined,
            args: {input: Cat},
            context: MyContext,
        ): Promise<Cat | {message: string}> => {
            if (!context.userdata) {
                throw new GraphQLError('User not authenticated', {
                  extensions: {
                    code: 'UNAUTHENTICATED',
                  },
                });
            }

            // get owner from context
            args.input = {
                ...args.input,
                owner: context.userdata.user._id,
            }
            
            const cat = await catModel.create(args.input);
            console.log('create cat resolver', cat);
            if (cat) {
                return cat;
            } else {
                return {message: 'cat not added'};
            }
        },
        updateCat: async (
            _parent: undefined,
            args: {id: string, input: Cat},
            context: MyContext,
        ): Promise<Cat | {message: string}> => {
            if (!context.userdata) {
                throw new GraphQLError('User not authorized', {
                  extensions: {
                    code: 'UNAUTHORIZED',
                  },
                });
            }
            if (context.userdata.user.role == 'admin') {
                const cat = await catModel.findOneAndUpdate(
                    {_id: args.id}, 
                    args.input, 
                    {new: true}
                );
                if (!cat) {
                    return {message: 'Cat not updated by admin'};
                }
                return cat;
            } else {
                const filter = {_id: args.id, owner: context.userdata.user._id};
                const cat = await catModel.findOneAndUpdate(
                    filter,
                    args.input,
                    {new: true}
                );
                if (!cat) {
                    return {message: 'Cat not updated'};
                }
                return cat;
            }
        },
        deleteCat: async (
            _parent: undefined,
            args: {id: string},
            context: MyContext,
        ): Promise<Cat | {message: string}> => {
            if (!context.userdata) {
                throw new GraphQLError('User not authorized', {
                  extensions: {
                    code: 'UNAUTHORIZED',
                  },
                });
            }
            if (context.userdata.user.role == 'admin') {
                const cat = await catModel.findOneAndDelete({_id: args.id});
                if (!cat) {
                    return {message: 'Cat not deleted by admin'};
                }
                return cat;
            } else {
                const filter = {_id: args.id, owner: context.userdata.user._id};
                const cat = await catModel.findOneAndDelete(filter);
                if (!cat) {
                    return {message: 'Cat not deleted'};
                }
                return cat;
            }
        },
    },
}